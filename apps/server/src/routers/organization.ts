import { protectedProcedure, router, withPermissions } from "../lib/trpc";
import prisma from "../../prisma";
import z from "zod";
import { TRPCError } from "@trpc/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3client } from "../lib/s3/index";
import {
  checkFile,
  extractS3Key,
  keyToFileUrl,
  mimeTypeToExtension,
} from "../lib/s3/utils";
import { deleteFile } from "../lib/s3/commands";
import { revalidateTag } from "next/cache";
import { stripe } from "../lib/stripe/server-stripe";
import { ACTIVITY_LOG_ACTIONS, addActivityLog } from "../lib/activitylogs";
import { Prisma } from "../../prisma/generated/client";
import {
  EmployeeRole,
  AppointmentPaymentStatus,
  AppointmentStatus,
  OrgRole,
} from "../../prisma/generated/enums";
import {
  organizationEmailService,
  type ContactListFilter,
} from "../lib/email/organization-email";

const promoCodeInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[A-Z0-9_-]+$/, "Use only uppercase letters, numbers, _ or -"),
  description: z.string().trim().max(200).optional(),
  discount: z.number().int().min(1).max(100),
  maxUsage: z.number().int().min(1).max(100000).optional(),
});

const CompanySizeSchema = z
  .enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"])
  .optional();

const organizationDomainSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(3)
    .max(255)
    .regex(/^([a-z\d-]+\.)+[a-z]{2,}$/i, "Enter a valid domain."),
});

const organizationSenderEmailSchema = z.object({
  email: z.email(),
  displayName: z.string().trim().max(120).optional(),
});

const organizationEmailIdentityIdSchema = z.object({
  id: z.string().min(1),
});

const organizationSendTestEmailSchema = z.object({
  id: z.string().min(1),
});

const organizationContactListSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  description: z.string().trim().max(500).optional(),
  filterMode: z.enum(["ALL", "ANY"]).default("ALL"),
  filters: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("SERVICE_USED"),
          serviceId: z.string().min(1, "Select a service."),
        }),
        z.object({
          type: z.literal("NO_APPOINTMENT_IN_DAYS"),
          days: z.number().int().min(1).max(3650),
        }),
        z.object({
          type: z.literal("APPOINTMENT_STATUS"),
          status: z.enum([
            "SCHEDULED",
            "COMPLETED",
            "CANCELED",
            "NO_SHOW",
            "RESCHEDULED",
          ]),
        }),
      ]),
    )
    .min(1, "Add at least one filter."),
});

const reportDurationSchema = z.enum(["7d", "30d", "90d", "180d", "365d"]);
const reportDurationInputSchema = z.object({
  duration: reportDurationSchema,
});
const reportMetricsInputSchema = reportDurationInputSchema.extend({
  locationId: z.string().min(1).optional(),
});

const assertOrganizationEmailManager = async (
  userId: string,
  organizationId: string,
) => {
  const membership = await prisma.managementMembership.findFirst({
    where: {
      userId,
      organizationId,
      role: {
        in: [OrgRole.OWNER, OrgRole.ADMIN],
      },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only organization owners and admins can manage sender identities.",
    });
  }
};

type ReportDuration = z.infer<typeof reportDurationSchema>;

const reportMonthLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
});
const PAID_APPOINTMENT_STATUSES: AppointmentPaymentStatus[] = [
  AppointmentPaymentStatus.PAID,
  AppointmentPaymentStatus.PARTIALLY_PAID,
];
const REPORT_DURATION_DAYS: Record<ReportDuration, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "180d": 180,
  "365d": 365,
};
const reportLocationSelect = {
  id: true,
  name: true,
  city: true,
  state: true,
} satisfies Prisma.LocationSelect;

const formatMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const getReportStartDate = (duration: ReportDuration) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - REPORT_DURATION_DAYS[duration] + 1);

  return start;
};

const getReportMonthBuckets = (startDate: Date, endDate = new Date()) => {
  const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const normalizedEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  const monthCount =
    (normalizedEnd.getFullYear() - normalizedStart.getFullYear()) * 12 +
    normalizedEnd.getMonth() -
    normalizedStart.getMonth() +
    1;

  return Array.from({ length: monthCount }, (_, index) => {
    const start = new Date(
      normalizedStart.getFullYear(),
      normalizedStart.getMonth() + index,
      1,
    );
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

    return {
      key: formatMonthKey(start),
      label: `${reportMonthLabelFormatter.format(start)} ${String(start.getFullYear()).slice(-2)}`,
      start,
      end,
    };
  });
};

const getOrganizationAppointmentWhere = (
  organizationId: string,
  options: {
    locationId?: string;
    startTimeGte?: Date;
    startTimeLt?: Date;
  } = {},
): Prisma.AppointmentWhereInput => ({
  location: {
    organizationId,
    ...(options.locationId ? { id: options.locationId } : {}),
  },
  ...(options.startTimeGte || options.startTimeLt
    ? {
        startTime: {
          ...(options.startTimeGte ? { gte: options.startTimeGte } : {}),
          ...(options.startTimeLt ? { lt: options.startTimeLt } : {}),
        },
      }
    : {}),
});

const getOrganizationReportLocation = async (
  organizationId: string,
  locationId?: string,
) => {
  if (!locationId) {
    return null;
  }

  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
      organizationId,
    },
    select: reportLocationSelect,
  });

  if (!location) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Report location not found.",
    });
  }

  return location;
};

const getStripeConnectOverview = async (organizationId: string) => {
  const organization = await prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
    select: {
      stripeAccountId: true,
    },
  });

  if (!organization) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Organization not found",
    });
  }

  if (!organization.stripeAccountId) {
    return {
      stripeAccountId: null,
      account: null,
    };
  }

  try {
    const account = await stripe.accounts.retrieve(organization.stripeAccountId);
    const currentlyDue = account.requirements?.currently_due ?? [];
    const eventuallyDue = account.requirements?.eventually_due ?? [];
    const pastDue = account.requirements?.past_due ?? [];
    const pendingVerification =
      account.requirements?.pending_verification ?? [];
    const onboardingComplete =
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled &&
      currentlyDue.length === 0 &&
      pastDue.length === 0;

    return {
      stripeAccountId: organization.stripeAccountId,
      account: {
        id: account.id,
        email: account.email,
        country: account.country,
        defaultCurrency: account.default_currency,
        businessType: account.business_type,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        onboardingComplete,
        requirements: {
          currentlyDue,
          eventuallyDue,
          pastDue,
          pendingVerification,
          disabledReason: account.requirements?.disabled_reason ?? null,
        },
      },
    };
  } catch (error) {
    console.error("Failed to retrieve Stripe Connect account", {
      organizationId,
      stripeAccountId: organization.stripeAccountId,
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
            }
          : error,
    });

    return {
      stripeAccountId: organization.stripeAccountId,
      account: null,
    };
  }
};

type SpecialistAssignment = {
  userId: string;
  user: {
    name: string;
    email: string;
  };
  location: {
    name: string;
  };
};

type SpecialistAppointmentAssignment = {
  startTime: Date;
  status: AppointmentStatus;
  price: number;
  service: Array<{
    price: number;
    locationEmployee: {
      userId: string;
      role: EmployeeRole;
      user: {
        name: string;
        email: string;
      };
      location: {
        name: string;
      };
    } | null;
  }>;
};

type SpecialistStats = {
  id: string;
  name: string;
  email: string;
  locations: Set<string>;
  appointmentsCount: number;
  completedAppointments: number;
  revenue: number;
  lastAppointmentAt: Date | null;
};

type SalesMonthRecord = {
  startTime: Date;
  price: number;
};

type RecentSaleRecord = {
  id: string;
  startTime: Date;
  price: number;
  paymentStatus: AppointmentPaymentStatus;
  status: AppointmentStatus;
  customer: {
    user: {
      name: string;
      email: string;
    };
  };
  location: {
    name: string;
  };
  service: Array<{
    serviceTerms: {
      name: string;
    };
  }>;
};

const isPaidAppointmentStatus = (status: AppointmentPaymentStatus) =>
  status === AppointmentPaymentStatus.PAID ||
  status === AppointmentPaymentStatus.PARTIALLY_PAID;

const buildMonthlySalesSeries = (
  monthBuckets: ReturnType<typeof getReportMonthBuckets>,
  monthlySales: SalesMonthRecord[],
) => {
  const monthlyMap = new Map(
    monthBuckets.map((bucket) => [
      bucket.key,
      {
        label: bucket.label,
        revenue: 0,
        appointments: 0,
      },
    ]),
  );

  for (const sale of monthlySales) {
    const month = monthlyMap.get(formatMonthKey(sale.startTime));
    if (!month) continue;
    month.revenue += sale.price;
    month.appointments += 1;
  }

  return Array.from(monthlyMap.values());
};

const mapRecentSales = (recentSales: RecentSaleRecord[]) =>
  recentSales.map((sale) => ({
    id: sale.id,
    startTime: sale.startTime,
    price: sale.price,
    paymentStatus: sale.paymentStatus,
    status: sale.status,
    customer: sale.customer,
    location: sale.location,
    services: sale.service.map((item) => item.serviceTerms.name),
  }));

const createSpecialistStats = (
  userId: string,
  name: string,
  email: string,
  locationName?: string,
): SpecialistStats => ({
  id: userId,
  name,
  email,
  locations: new Set(locationName ? [locationName] : []),
  appointmentsCount: 0,
  completedAppointments: 0,
  revenue: 0,
  lastAppointmentAt: null,
});

const seedSpecialistStatsMap = (specialistAssignments: SpecialistAssignment[]) => {
  const specialistMap = new Map<string, SpecialistStats>();

  for (const assignment of specialistAssignments) {
    const existing = specialistMap.get(assignment.userId);

    if (existing) {
      existing.locations.add(assignment.location.name);
      continue;
    }

    specialistMap.set(
      assignment.userId,
      createSpecialistStats(
        assignment.userId,
        assignment.user.name,
        assignment.user.email,
        assignment.location.name,
      ),
    );
  }

  return specialistMap;
};

const collectAppointmentSpecialists = (
  appointment: SpecialistAppointmentAssignment,
) => {
  const appointmentSpecialists = new Map<
    string,
    {
      price: number;
      name: string;
      email: string;
      locationName: string;
    }
  >();

  for (const service of appointment.service) {
    const specialist = service.locationEmployee;

    if (specialist?.role !== EmployeeRole.LOCATION_SPECIALIST) {
      continue;
    }

    const existing = appointmentSpecialists.get(specialist.userId);
    if (existing) {
      existing.price += service.price;
      continue;
    }

    appointmentSpecialists.set(specialist.userId, {
      price: service.price,
      name: specialist.user.name,
      email: specialist.user.email,
      locationName: specialist.location.name,
    });
  }

  return appointmentSpecialists;
};

const applyAppointmentToSpecialistMap = (
  specialistMap: Map<string, SpecialistStats>,
  appointment: SpecialistAppointmentAssignment,
) => {
  const appointmentSpecialists = collectAppointmentSpecialists(appointment);

  if (appointmentSpecialists.size === 0) {
    return;
  }

  const totalAssignedPrice = Array.from(appointmentSpecialists.values()).reduce(
    (sum, specialist) => sum + specialist.price,
    0,
  );

  for (const [userId, specialist] of appointmentSpecialists) {
    const revenueShare =
      totalAssignedPrice > 0
        ? Math.round((appointment.price * specialist.price) / totalAssignedPrice)
        : Math.round(appointment.price / appointmentSpecialists.size);

    const stats =
      specialistMap.get(userId) ??
      createSpecialistStats(
        userId,
        specialist.name,
        specialist.email,
        specialist.locationName,
      );

    stats.locations.add(specialist.locationName);
    stats.appointmentsCount += 1;
    if (appointment.status === AppointmentStatus.COMPLETED) {
      stats.completedAppointments += 1;
    }
    stats.revenue += revenueShare;

    if (
      !stats.lastAppointmentAt ||
      appointment.startTime.getTime() > stats.lastAppointmentAt.getTime()
    ) {
      stats.lastAppointmentAt = appointment.startTime;
    }

    specialistMap.set(userId, stats);
  }
};

const buildSpecialistReport = (
  specialistAssignments: SpecialistAssignment[],
  appointmentAssignments: SpecialistAppointmentAssignment[],
) => {
  const specialistMap = seedSpecialistStatsMap(specialistAssignments);

  for (const appointment of appointmentAssignments) {
    applyAppointmentToSpecialistMap(specialistMap, appointment);
  }

  const specialists = Array.from(specialistMap.values())
    .map((specialist) => ({
      ...specialist,
      locations: Array.from(specialist.locations.values()),
    }))
    .sort((left, right) => {
      const byRevenue = right.revenue - left.revenue;
      if (byRevenue !== 0) return byRevenue;
      return right.appointmentsCount - left.appointmentsCount;
    });

  const totalAppointments = specialists.reduce(
    (sum, specialist) => sum + specialist.appointmentsCount,
    0,
  );
  const totalRevenue = specialists.reduce(
    (sum, specialist) => sum + specialist.revenue,
    0,
  );

  return {
    summary: {
      totalSpecialists: specialists.length,
      totalRevenue,
      averageAppointmentsPerSpecialist:
        specialists.length > 0 ? Math.round(totalAppointments / specialists.length) : 0,
      topSpecialist: specialists[0] ?? null,
    },
    chartData: specialists.slice(0, 6).map((specialist) => ({
      name: specialist.name,
      revenue: specialist.revenue,
      appointments: specialist.appointmentsCount,
    })),
    specialists,
  };
};

export const organizationRouter = router({
  createOrganization: protectedProcedure
    .input(
      z.object({
        businessName: z.string().trim(),
        businessDescription: z.string().trim().optional(),
        companySize: CompanySizeSchema,
        logo: z
          .url()
          .optional()
          .refine((url) => !url || url.startsWith("https://"), {
            message: "Logo URL must use https://",
          }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { businessName, businessDescription, companySize, logo } = input;
        const slug = `${businessName
          .toLowerCase()
          .split(/\s+/)
          .join("-")}-${Math.floor(1000 + Math.random() * 9000)}`;

        const user = await prisma.user.findFirst({
          where: {
            id: ctx.session.user.id,
          },
          include: {
            _count: {
              select: {
                locationEmployees: true,
              },
            },
            management: true,
          },
        });

        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "There is no user",
          });
        }

        if (user._count.locationEmployees > 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "User is already associated with an organization.",
          });
        }

        const ownerManagement = user.management.find((u) => u.role === "OWNER");

        if (!ownerManagement?.role) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have any organization.",
          });
        }

        const organization = await prisma.organization.create({
          data: {
            name: businessName,
            description: businessDescription,
            companySize,
            logo,
            slug,
            management: {
              connect: {
                id: ownerManagement.id,
              },
            },
          },
        });

        addActivityLog({
          type: ACTIVITY_LOG_ACTIONS.CREATED_ORGANIZATION,
          description: `Organization ${organization.name} was created.`,
          userId: ctx.session.user.id,
          organizationId: organization.id,
        });

        return organization;
      } catch (error) {
        // Cleanup
        if (input.logo) {
          try {
            const key = extractS3Key(input.logo);
            if (key) await deleteFile(key);
          } catch (cleanupError) {
            console.error("Failed to cleanup uploaded logo:", cleanupError);
          }
        }

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          message: "Something went wrong",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),

  updateOrganizationGeneralInfo: withPermissions("UPDATE::ORGANIZATION")
    .input(
      z.object({
        businessName: z.string().trim(),
        businessDescription: z.string().trim().optional(),
        companySize: CompanySizeSchema,
        logo: z.url().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { businessName, businessDescription, companySize, logo } = input;
        console.log("Update org info:", input);
        const organization = await prisma.organization.update({
          where: {
            id: ctx.orgWithSub.id,
          },
          data: {
            name: businessName,
            description: businessDescription,
            companySize,
            logo,
          },
        });

        addActivityLog({
          type: ACTIVITY_LOG_ACTIONS.UPDATED_ORGANIZATION,
          description: `Organization profile was updated to ${businessName}.`,
          userId: ctx.session.user.id,
          organizationId: ctx.orgWithSub.id,
        });

        revalidateTag(ctx.orgWithSub.id);
        return organization;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          message: "Something went wrong",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),
  initLogoUpload: protectedProcedure
    .input(
      z.object({
        mimeType: z.string().min(1),
        filesize: z.number().min(1),
        checksum: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { mimeType, filesize, checksum } = input;

      const res = checkFile("logos", {
        clientFileSize: filesize,
        clientFileType: mimeType,
      });
      if (!res.valid) {
        throw new TRPCError({
          message: res.reason,
          code: "INTERNAL_SERVER_ERROR",
          cause: res.code,
        });
      }

      const extension = mimeTypeToExtension(mimeType);
      if (!extension) {
        console.error(
          "This should not happened there is a flow in code while uploading file",
        );
        throw new TRPCError({
          message: "Something Went Wrong",
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      // Generate safe key on server
      const key = `user/${ctx.session.user.id}/org_logo.${extension}`;
      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        ContentType: mimeType,
        ContentLength: filesize,
        ChecksumSHA256: checksum,
      });

      const signedUrl = await getSignedUrl(S3client, command, {
        expiresIn: 600, // 10 minutes
      });
      console.log(signedUrl);

      const url = keyToFileUrl(key);

      return {
        signedUrl,
        url,
      };
    }),
  getOrganizationDetails: withPermissions("READ::ORGANIZATION").query(
    async ({ ctx }) => {
      const organization = await prisma.organization.findUnique({
        where: {
          id: ctx.orgWithSub.id,
        },
        select: {
          id: true,
          name: true,
          description: true,
          companySize: true,
          logo: true,
          stripeAccountId: true,
          updatedAt: true,
          createdAt: true,
        },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      const companySize = CompanySizeSchema.safeParse(
        organization.companySize,
      ).data;

      return { ...organization, companySize };
    },
  ),
  getStripeConnectOverview: withPermissions("UPDATE::SUBSCRIPTION").query(
    async ({ ctx }) => getStripeConnectOverview(ctx.orgWithSub.id),
  ),
  getReportsOverview: withPermissions("READ::ORGANIZATION").query(
    async ({ ctx }) => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const paidStatuses = [
        AppointmentPaymentStatus.PAID,
        AppointmentPaymentStatus.PARTIALLY_PAID,
      ];

      const organizationId = ctx.orgWithSub.id;

      const [
        totalCustomers,
        totalAppointments,
        completedAppointments,
        scheduledAppointments,
        paymentsAwaitingCount,
        totalSales,
        monthlySales,
        pendingSales,
        recentCustomers,
        pendingPayments,
      ] = await Promise.all([
        prisma.customer.count({
          where: {
            orgId: organizationId,
          },
        }),
        prisma.appointment.count({
          where: {
            location: {
              organizationId,
            },
          },
        }),
        prisma.appointment.count({
          where: {
            location: {
              organizationId,
            },
            status: AppointmentStatus.COMPLETED,
          },
        }),
        prisma.appointment.count({
          where: {
            location: {
              organizationId,
            },
            status: {
              in: [AppointmentStatus.SCHEDULED, AppointmentStatus.RESCHEDULED],
            },
          },
        }),
        prisma.appointment.count({
          where: {
            location: {
              organizationId,
            },
            paymentStatus: AppointmentPaymentStatus.PAYMENT_PENDING,
          },
        }),
        prisma.appointment.aggregate({
          where: {
            location: {
              organizationId,
            },
            paymentStatus: {
              in: paidStatuses,
            },
          },
          _sum: {
            price: true,
          },
        }),
        prisma.appointment.aggregate({
          where: {
            location: {
              organizationId,
            },
            paymentStatus: {
              in: paidStatuses,
            },
            startTime: {
              gte: monthStart,
              lt: nextMonthStart,
            },
          },
          _sum: {
            price: true,
          },
        }),
        prisma.appointment.aggregate({
          where: {
            location: {
              organizationId,
            },
            paymentStatus: AppointmentPaymentStatus.PAYMENT_PENDING,
          },
          _sum: {
            price: true,
          },
        }),
        prisma.customer.findMany({
          take: 6,
          where: {
            orgId: organizationId,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            createdAt: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                appointments: true,
              },
            },
          },
        }),
        prisma.appointment.findMany({
          take: 6,
          where: {
            location: {
              organizationId,
            },
            paymentStatus: AppointmentPaymentStatus.PAYMENT_PENDING,
          },
          orderBy: {
            startTime: "asc",
          },
          select: {
            id: true,
            startTime: true,
            price: true,
            customer: {
              select: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
            location: {
              select: {
                name: true,
              },
            },
          },
        }),
      ]);

      return {
        summary: {
          totalSales: totalSales._sum.price ?? 0,
          monthlySales: monthlySales._sum.price ?? 0,
          totalCustomers,
          totalAppointments,
          completedAppointments,
          scheduledAppointments,
          paymentsAwaitingCount,
          paymentsAwaitingAmount: pendingSales._sum.price ?? 0,
        },
        recentCustomers,
        paymentsAwaiting: pendingPayments,
      };
    },
  ),
  getReportLocations: withPermissions("READ::ORGANIZATION").query(
    async ({ ctx }) =>
      prisma.location.findMany({
        where: {
          organizationId: ctx.orgWithSub.id,
        },
        select: reportLocationSelect,
        orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      }),
  ),
  getMetricsReport: withPermissions("READ::ORGANIZATION")
    .input(reportMetricsInputSchema)
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.orgWithSub.id;
      const selectedLocation = await getOrganizationReportLocation(
        organizationId,
        input.locationId,
      );
      const reportStart = getReportStartDate(input.duration);
      const appointmentWhere = getOrganizationAppointmentWhere(organizationId, {
        locationId: selectedLocation?.id,
        startTimeGte: reportStart,
      });
      const monthBuckets = getReportMonthBuckets(reportStart);

      const [
        totalAppointments,
        completedAppointments,
        scheduledAppointments,
        canceledAppointments,
        noShowAppointments,
        pendingPayments,
        totalRevenue,
        monthlyAppointments,
        statusBreakdown,
        paymentBreakdown,
      ] = await Promise.all([
        prisma.appointment.count({
          where: appointmentWhere,
        }),
        prisma.appointment.count({
          where: {
            ...appointmentWhere,
            status: AppointmentStatus.COMPLETED,
          },
        }),
        prisma.appointment.count({
          where: {
            ...appointmentWhere,
            status: {
              in: [AppointmentStatus.SCHEDULED, AppointmentStatus.RESCHEDULED],
            },
          },
        }),
        prisma.appointment.count({
          where: {
            ...appointmentWhere,
            status: AppointmentStatus.CANCELED,
          },
        }),
        prisma.appointment.count({
          where: {
            ...appointmentWhere,
            status: AppointmentStatus.NO_SHOW,
          },
        }),
        prisma.appointment.count({
          where: {
            ...appointmentWhere,
            paymentStatus: AppointmentPaymentStatus.PAYMENT_PENDING,
          },
        }),
        prisma.appointment.aggregate({
          where: {
            ...appointmentWhere,
            paymentStatus: {
              in: PAID_APPOINTMENT_STATUSES,
            },
          },
          _sum: {
            price: true,
          },
        }),
        prisma.appointment.findMany({
          where: appointmentWhere,
          select: {
            startTime: true,
            status: true,
            price: true,
            paymentStatus: true,
          },
          orderBy: {
            startTime: "asc",
          },
        }),
        prisma.appointment.groupBy({
          by: ["status"],
          where: appointmentWhere,
          _count: {
            _all: true,
          },
        }),
        prisma.appointment.groupBy({
          by: ["paymentStatus"],
          where: appointmentWhere,
          _count: {
            _all: true,
          },
        }),
      ]);

      const monthlyMap = new Map(
        monthBuckets.map((bucket) => [
          bucket.key,
          {
            label: bucket.label,
            appointments: 0,
            completed: 0,
            revenue: 0,
          },
        ]),
      );

      for (const appointment of monthlyAppointments) {
        const key = formatMonthKey(appointment.startTime);
        const month = monthlyMap.get(key);

        if (!month) continue;

        month.appointments += 1;

        if (appointment.status === AppointmentStatus.COMPLETED) {
          month.completed += 1;
        }

        if (isPaidAppointmentStatus(appointment.paymentStatus)) {
          month.revenue += appointment.price;
        }
      }

      const completionRate =
        totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;
      const noShowRate =
        totalAppointments > 0 ? (noShowAppointments / totalAppointments) * 100 : 0;

      return {
        selectedLocation,
        summary: {
          totalAppointments,
          completedAppointments,
          scheduledAppointments,
          canceledAppointments,
          noShowAppointments,
          pendingPayments,
          totalRevenue: totalRevenue._sum?.price ?? 0,
          completionRate: Math.round(completionRate * 10) / 10,
          noShowRate: Math.round(noShowRate * 10) / 10,
        },
        monthlySeries: Array.from(monthlyMap.values()),
        statusBreakdown: statusBreakdown.map((item) => ({
          status: item.status,
          count: item._count._all,
        })),
        paymentBreakdown: paymentBreakdown.map((item) => ({
          status: item.paymentStatus,
          count: item._count._all,
        })),
      };
    }),
  getSalesReport: withPermissions("READ::ORGANIZATION")
    .input(reportDurationInputSchema)
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.orgWithSub.id;
      const reportStart = getReportStartDate(input.duration);
      const appointmentWhere = getOrganizationAppointmentWhere(organizationId, {
        startTimeGte: reportStart,
      });
      const monthBuckets = getReportMonthBuckets(reportStart);
      const currentMonthStart = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      );

      const [
        totalSales,
        thisMonthSales,
        pendingSales,
        paidAppointmentsCount,
        averageSaleValue,
        monthlySales,
        recentSales,
      ] = await Promise.all([
        prisma.appointment.aggregate({
          where: {
            ...appointmentWhere,
            paymentStatus: {
              in: PAID_APPOINTMENT_STATUSES,
            },
          },
          _sum: {
            price: true,
          },
        }),
        prisma.appointment.aggregate({
          where: {
            paymentStatus: {
              in: PAID_APPOINTMENT_STATUSES,
            },
            startTime: {
              gte:
                reportStart.getTime() > currentMonthStart.getTime()
                  ? reportStart
                  : currentMonthStart,
            },
            location: {
              organizationId,
            },
          },
          _sum: {
            price: true,
          },
        }),
        prisma.appointment.aggregate({
          where: {
            ...appointmentWhere,
            paymentStatus: AppointmentPaymentStatus.PAYMENT_PENDING,
          },
          _sum: {
            price: true,
          },
        }),
        prisma.appointment.count({
          where: {
            ...appointmentWhere,
            paymentStatus: {
              in: PAID_APPOINTMENT_STATUSES,
            },
          },
        }),
        prisma.appointment.aggregate({
          where: {
            ...appointmentWhere,
            paymentStatus: {
              in: PAID_APPOINTMENT_STATUSES,
            },
          },
          _avg: {
            price: true,
          },
        }),
        prisma.appointment.findMany({
          where: {
            ...appointmentWhere,
            paymentStatus: {
              in: PAID_APPOINTMENT_STATUSES,
            },
          },
          select: {
            startTime: true,
            price: true,
          },
          orderBy: {
            startTime: "asc",
          },
        }),
        prisma.appointment.findMany({
          take: 25,
          where: {
            ...appointmentWhere,
            paymentStatus: {
              in: PAID_APPOINTMENT_STATUSES,
            },
          },
          orderBy: {
            startTime: "desc",
          },
          select: {
            id: true,
            startTime: true,
            price: true,
            paymentStatus: true,
            status: true,
            customer: {
              select: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
            location: {
              select: {
                name: true,
              },
            },
            service: {
              select: {
                serviceTerms: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      return {
        summary: {
          totalSales: totalSales._sum?.price ?? 0,
          thisMonthSales: thisMonthSales._sum?.price ?? 0,
          pendingSales: pendingSales._sum?.price ?? 0,
          paidAppointmentsCount,
          averageSaleValue: Math.round(averageSaleValue._avg?.price ?? 0),
        },
        monthlySales: buildMonthlySalesSeries(monthBuckets, monthlySales),
        sales: mapRecentSales(recentSales),
      };
    }),
  getCustomersReport: withPermissions("READ::ORGANIZATION")
    .input(reportDurationInputSchema)
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.orgWithSub.id;
      const reportStart = getReportStartDate(input.duration);
      const appointmentWhere = getOrganizationAppointmentWhere(organizationId, {
        startTimeGte: reportStart,
      });

      const [totalCustomers, customerStats, pendingStats, fallbackCustomers] =
        await Promise.all([
          prisma.customer.count({
            where: {
              orgId: organizationId,
            },
          }),
          prisma.appointment.groupBy({
            by: ["customerId"],
            where: appointmentWhere,
            _count: {
              _all: true,
            },
            _sum: {
              price: true,
            },
            _max: {
              startTime: true,
            },
          }),
          prisma.appointment.groupBy({
            by: ["customerId"],
            where: {
              ...appointmentWhere,
              paymentStatus: AppointmentPaymentStatus.PAYMENT_PENDING,
            },
            _count: {
              _all: true,
            },
            _sum: {
              price: true,
            },
          }),
          prisma.customer.findMany({
            take: 25,
            where: {
              orgId: organizationId,
            },
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
            },
          }),
        ]);

      const sortedCustomerStats = [...customerStats].sort((left, right) => {
        const byAppointments = right._count._all - left._count._all;
        if (byAppointments !== 0) return byAppointments;

        return (right._sum.price ?? 0) - (left._sum.price ?? 0);
      });

      const orderedCustomerIds: string[] = [];
      const seenCustomerIds = new Set<string>();

      for (const stat of sortedCustomerStats) {
        if (seenCustomerIds.has(stat.customerId)) continue;
        seenCustomerIds.add(stat.customerId);
        orderedCustomerIds.push(stat.customerId);
        if (orderedCustomerIds.length >= 25) break;
      }

      for (const customer of fallbackCustomers) {
        if (seenCustomerIds.has(customer.id)) continue;
        seenCustomerIds.add(customer.id);
        orderedCustomerIds.push(customer.id);
        if (orderedCustomerIds.length >= 25) break;
      }

      const customers = orderedCustomerIds.length
        ? await prisma.customer.findMany({
            where: {
              id: {
                in: orderedCustomerIds,
              },
            },
            select: {
              id: true,
              createdAt: true,
              phoneNumber: true,
              status: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          })
        : [];

      const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
      const customerStatsMap = new Map(
        customerStats.map((stat) => [
          stat.customerId,
          {
            totalAppointments: stat._count._all,
            totalSpent: stat._sum?.price ?? 0,
            lastAppointmentAt: stat._max.startTime ?? null,
          },
        ]),
      );
      const pendingStatsMap = new Map(
        pendingStats.map((stat) => [
          stat.customerId,
          {
            pendingAppointments: stat._count._all,
            pendingAmount: stat._sum.price ?? 0,
          },
        ]),
      );

      const customerRows = orderedCustomerIds
        .map((customerId) => {
          const customer = customerMap.get(customerId);
          if (!customer) return null;

          const stats = customerStatsMap.get(customerId);
          const pending = pendingStatsMap.get(customerId);

          return {
            ...customer,
            totalAppointments: stats?.totalAppointments ?? 0,
            totalSpent: stats?.totalSpent ?? 0,
            lastAppointmentAt: stats?.lastAppointmentAt ?? null,
            pendingAppointments: pending?.pendingAppointments ?? 0,
            pendingAmount: pending?.pendingAmount ?? 0,
          };
        })
        .filter((customer) => customer !== null);

      const mostLoyalCustomer = customerRows[0] ?? null;
      const totalPendingAmount = pendingStats.reduce(
        (sum, stat) => sum + (stat._sum.price ?? 0),
        0,
      );

      return {
        summary: {
          totalCustomers,
          activeCustomers: customerStats.length,
          customersWithPendingPayments: pendingStats.length,
          totalPendingAmount,
        },
        mostLoyalCustomer,
        customers: customerRows,
      };
    }),
  getSpecialistsReport: withPermissions("READ::ORGANIZATION")
    .input(reportDurationInputSchema)
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.orgWithSub.id;
      const reportStart = getReportStartDate(input.duration);
      const appointmentWhere = getOrganizationAppointmentWhere(organizationId, {
        startTimeGte: reportStart,
      });

      const [specialistAssignments, appointmentAssignments] = await Promise.all([
        prisma.locationEmployee.findMany({
          where: {
            location: {
              organizationId,
            },
            role: EmployeeRole.LOCATION_SPECIALIST,
          },
          select: {
            id: true,
            userId: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            location: {
              select: {
                name: true,
              },
            },
          },
        }),
        prisma.appointment.findMany({
          where: {
            ...appointmentWhere,
            service: {
              some: {
                locationEmployeeId: {
                  not: null,
                },
              },
            },
          },
          select: {
            id: true,
            startTime: true,
            status: true,
            price: true,
            service: {
              select: {
                price: true,
                locationEmployeeId: true,
                locationEmployee: {
                  select: {
                    userId: true,
                    role: true,
                    user: {
                      select: {
                        name: true,
                        email: true,
                      },
                    },
                    location: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

      return buildSpecialistReport(specialistAssignments, appointmentAssignments);
    }),
  getOrganizationEmailSettings: withPermissions("UPDATE::ORGANIZATION").query(
    async ({ ctx }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
      return organizationEmailService.getSettings(ctx.orgWithSub.id);
    },
  ),
  createOrganizationEmailDomain: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationDomainSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
      return organizationEmailService.createDomain({
        organizationId: ctx.orgWithSub.id,
        domain: input.domain,
      });
    }),
  refreshOrganizationEmailDomain: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationEmailIdentityIdSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
      return organizationEmailService.refreshDomain({
        organizationId: ctx.orgWithSub.id,
        domainId: input.id,
      });
    }),
  deleteOrganizationEmailDomain: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationEmailIdentityIdSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
      return organizationEmailService.deleteDomain({
        organizationId: ctx.orgWithSub.id,
        domainId: input.id,
      });
    }),
  createOrganizationSenderEmail: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationSenderEmailSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
        return organizationEmailService.createSenderEmail({
          organizationId: ctx.orgWithSub.id,
          email: input.email,
          displayName: input.displayName,
        });
      } catch (error) {
        console.error("Failed to create sender email identity:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create sender email identity",
          cause: error,
        });
      }

    }),
  refreshOrganizationSenderEmail: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationEmailIdentityIdSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
      return organizationEmailService.refreshSenderEmail({
        organizationId: ctx.orgWithSub.id,
        senderEmailId: input.id,
      });
    }),
  deleteOrganizationSenderEmail: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationEmailIdentityIdSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
      return organizationEmailService.deleteSenderEmail({
        organizationId: ctx.orgWithSub.id,
        senderEmailId: input.id,
      });
    }),
  setOrganizationDefaultSenderEmail: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationEmailIdentityIdSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
      return organizationEmailService.setDefaultSenderEmail({
        organizationId: ctx.orgWithSub.id,
        senderEmailId: input.id,
      });
    }),
  sendOrganizationTestEmail: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationSendTestEmailSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);

      if (!ctx.session.user.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Your account does not have an email address for receiving test emails.",
        });
      }

      return organizationEmailService.sendTestEmail({
        organizationId: ctx.orgWithSub.id,
        senderEmailId: input.id,
        to: ctx.session.user.email,
        organizationName: ctx.orgWithSub.name,
        requestedByName: ctx.session.user.name,
      });
    }),
  createOrganizationContactList: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationContactListSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
      return organizationEmailService.createContactList({
        organizationId: ctx.orgWithSub.id,
        name: input.name,
        description: input.description,
        filterMode: input.filterMode,
        filters: input.filters as ContactListFilter[],
      });
    }),
  deleteOrganizationContactList: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationEmailIdentityIdSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
      return organizationEmailService.deleteContactList({
        organizationId: ctx.orgWithSub.id,
        contactListId: input.id,
      });
    }),
  createStripeConnectAccount: withPermissions("UPDATE::SUBSCRIPTION").mutation(
    async ({ ctx }) => {
      const dashboardUrl = process.env.DASHBOARD_URL;
      if (!dashboardUrl) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Missing DASHBOARD_URL configuration",
        });
      }

      const organization = await prisma.organization.findUnique({
        where: {
          id: ctx.orgWithSub.id,
        },
        select: {
          id: true,
          name: true,
          stripeAccountId: true,
        },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      let stripeAccountId = organization.stripeAccountId;
      if (!stripeAccountId) {
        const account = await stripe.accounts.create({
          type: "express",
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          email: ctx.session.user.email,
          business_profile: {
            name: organization.name,
          },
          metadata: {
            organizationId: organization.id,
          },
        });

        stripeAccountId = account.id;
        await prisma.organization.update({
          where: { id: organization.id },
          data: { stripeAccountId },
        });
      }

      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${dashboardUrl}/settings?tab=billing`,
        return_url: `${dashboardUrl}/settings?tab=billing`,
        type: "account_onboarding",
      });

      return {
        accountId: stripeAccountId,
        url: accountLink.url,
      };
    },
  ),
  getStripeDashboardLink: withPermissions("UPDATE::SUBSCRIPTION").mutation(
    async ({ ctx }) => {
      const stripeOverview = await getStripeConnectOverview(ctx.orgWithSub.id);

      if (!stripeOverview.stripeAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Stripe is not connected for this organization",
        });
      }

      const loginLink = await stripe.accounts.createLoginLink(
        stripeOverview.stripeAccountId,
      );

      return {
        accountId: stripeOverview.stripeAccountId,
        url: loginLink.url,
      };
    },
  ),
  getOrganizationUsers: withPermissions("READ::MEMBERS").query(
    async ({ ctx }) => {
      const users = await prisma.managementMembership.findMany({
        where: {
          organizationId: ctx.orgWithSub.id,
        },
        select: {
          role: true,
          id: true,
          user: {
            select: {
              name: true,
              email: true,
              id: true,
              image: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      return users;
    },
  ),

  removeOrganizationMember: withPermissions("DELETE::MEMBERS")
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input: { userId }, ctx }) => {
      const userToRemove = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          management: true,
        },
      });

      if (!userToRemove?.management) {
        throw new TRPCError({
          message: "The user is not a part of organization",
          code: "BAD_REQUEST",
        });
      }

      if (userToRemove.management.some((m) => m.role === "OWNER")) {
        throw new TRPCError({
          message: "Owner cannot be removed from organization",
          code: "BAD_REQUEST",
        });
      }

      if (
        ctx.session.user.management?.role !== "OWNER" &&
        userToRemove.management.some((m) => m.role === "ADMIN")
      ) {
        throw new TRPCError({
          message:
            "You dont have privlage to remove another admin. Please ask Owner to remove admin",
          code: "BAD_REQUEST",
        });
      }

      await prisma.user.delete({
        where: {
          id: userId,
        },
      });

      addActivityLog({
        type: ACTIVITY_LOG_ACTIONS.REMOVED_ORGANIZATION_MEMBER,
        description: `Organization member ${userToRemove.email} was removed.`,
        userId: ctx.session.user.id,
        organizationId: ctx.orgWithSub.id,
      });

      revalidateTag(ctx.orgWithSub.id);
      return { success: true };
    }),

  listOrganizationPromoCodes: withPermissions("READ::ORGANIZATION").query(
    async ({ ctx }) => {
      return prisma.promoCode.findMany({
        where: {
          organizationId: ctx.orgWithSub.id,
          appliesToLevel: "ORGANIZATION",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          code: true,
          description: true,
          discount: true,
          maxUsage: true,
          isActive: true,
          createdAt: true,
        },
      });
    },
  ),

  createOrganizationPromoCode: withPermissions("UPDATE::ORGANIZATION")
    .input(promoCodeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const normalizedCode = input.code.toUpperCase();

      try {
        return await prisma.promoCode.create({
          data: {
            code: normalizedCode,
            description: input.description,
            discount: input.discount,
            maxUsage: input.maxUsage,
            organizationId: ctx.orgWithSub.id,
            appliesToLevel: "ORGANIZATION",
          },
          select: {
            id: true,
            code: true,
            description: true,
            discount: true,
            maxUsage: true,
            isActive: true,
          },
        });
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          (error as { code?: string }).code === "P2002"
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Promo code already exists",
          });
        }

        throw error;
      }
    }),

  updateOrganizationPromoCode: withPermissions("UPDATE::ORGANIZATION")
    .input(
      z.object({
        promoCodeId: z.string(),
        isActive: z.boolean().optional(),
        description: z.string().trim().max(200).optional(),
        discount: z.number().int().min(1).max(100).optional(),
        maxUsage: z.number().int().min(1).max(100000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.promoCode.findFirst({
        where: {
          id: input.promoCodeId,
          organizationId: ctx.orgWithSub.id,
          appliesToLevel: "ORGANIZATION",
        },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Promo code not found",
        });
      }

      return prisma.promoCode.update({
        where: { id: input.promoCodeId },
        data: {
          ...(typeof input.isActive === "boolean" && {
            isActive: input.isActive,
          }),
          ...(typeof input.description === "string" && {
            description: input.description,
          }),
          ...(typeof input.discount === "number" && {
            discount: input.discount,
          }),
          ...(input.maxUsage !== undefined && {
            maxUsage: input.maxUsage,
          }),
        },
        select: {
          id: true,
          code: true,
          description: true,
          discount: true,
          maxUsage: true,
          isActive: true,
        },
      });
    }),

  deleteOrganizationPromoCode: withPermissions("UPDATE::ORGANIZATION")
    .input(
      z.object({
        promoCodeId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.promoCode.findFirst({
        where: {
          id: input.promoCodeId,
          organizationId: ctx.orgWithSub.id,
          appliesToLevel: "ORGANIZATION",
        },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Promo code not found",
        });
      }

      await prisma.promoCode.delete({
        where: { id: input.promoCodeId },
      });

      return { success: true };
    }),
});
