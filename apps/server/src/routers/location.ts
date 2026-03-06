import z from "zod";
import { router, withPermissions } from "../lib/trpc";
import prisma from "../../prisma";
import { TRPCError } from "@trpc/server";

import { isValidPhoneNumber } from "libphonenumber-js";
import { revalidateTag } from "next/cache";
import {
  getWeeklySchedule,
  updateWeeklySchedule,
} from "../lib/locations/operating-hours";
import { ExceptionService } from "../lib/appointment/holidays";

const locationPromoCodeSchema = z.object({
  locationId: z.string(),
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

const organizationPromoCodeSchema = z.object({
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

const CreateLocationSchema = z.object({
  name: z.string().min(2, "Location name must be at least 2 characters"),
  address: z.string().min(5, "Please enter a valid address"),
  city: z.string().min(2, "City name must be at least 2 characters"),
  state: z.string().min(2, "Please select a state"),
  country: z.string().min(2, "Please select a country"),
  zipCode: z.string().min(5, "Please enter a valid zip code"),
  timeZone: z.string().min(1, "Time zone is required"),
  email: z.string().email("Please enter a valid email address"),
  phoneNumber: z
    .string()
    .refine((p) => isValidPhoneNumber(p), { message: "Invalid Phone Number" }),
});

const createLocation = withPermissions(
  "CREATE::LOCATION",
  CreateLocationSchema
).mutation(async ({ ctx, input }) => {
  if (!ctx.orgWithSub.id) {
    console.error(
      "[EXTREME] We got org without an id but inside subscription it should not happen"
    );
    throw new TRPCError({
      message: "Something is not right :(",
      code: "BAD_REQUEST",
    });
  }

  const currentLocationCount = await prisma.location.count({
    where: { organizationId: ctx.orgWithSub.id },
  });

  if (
    currentLocationCount >= (ctx.orgWithSub.subscription?.maximumLocations ?? 0)
  ) {
    throw new TRPCError({
      message:
        "You already created maximum number of locations available within your subscription plan. Upgrade to create more",
      code: "BAD_REQUEST",
    });
  }

  const createdLocation = await prisma.location.create({
    data: {
      name: input.name.replace(/\s+/g, "-"),
      address: input.address,
      city: input.city,
      slug: input.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/(^-|-$)+/g, "")
        .substring(0, 50),
      country: input.country,
      email: input.email,
      employees: {
        create: {
          role: "ORGANIZATION_MANAGEMENT",
          userId: ctx.session.user.id,
        },
      },
      organizationId: ctx.orgWithSub.id,
      phoneNumber: input.phoneNumber,
      state: input.state,
      timeZone: input.timeZone,
      zipCode: input.zipCode,
    },
  });

  if (!createdLocation) {
    throw new TRPCError({
      message: "Something went wrong :(",
      code: "INTERNAL_SERVER_ERROR",
    });
  }

  await revalidateTag(ctx.orgWithSub.id);

  return {
    id: createdLocation.id,
    success: true,
  };
});

const getAllLocations = withPermissions("READ::ADMIN_LOCATION").query(
  async ({ ctx }) => {
    const locations = await prisma.location.findMany({
      where: {
        organizationId: ctx.session.user.organizationId,
      },
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    return locations;
  }
);

const getLocation = withPermissions(
  "READ::LOCATION",
  z.object({ slug: z.string() })
).query(async ({ ctx, input }) => {
  const hasPermissionToLocation = ctx.session.user.employees?.find(
    (emp) => emp.locationSlug === input.slug
  );

  if (!hasPermissionToLocation) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "You are not allowed to view the location details. or location may not exist",
    });
  }

  const location = await prisma.location.findFirst({
    where: {
      slug: input.slug,
    },
  });

  return location;
});

const getLocationEmployees = withPermissions(
  "READ::LOCATION",
  z.object({ slug: z.string() })
).query(async ({ ctx, input }) => {
  const employeeAccess = ctx.session.user.employees?.find(
    (emp) => emp.locationSlug === input.slug
  );

  if (!employeeAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not allowed to view employees for this location.",
    });
  }

  const isManagement =
    employeeAccess.role === "ORGANIZATION_MANAGEMENT" ||
    employeeAccess.role === "LOCATION_ADMIN";

  if (!isManagement) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only management can view location employees.",
    });
  }

  const location = await prisma.location.findFirst({
    where: {
      slug: input.slug,
      organizationId: ctx.session.user.organizationId,
    },
    select: {
      id: true,
      employees: {
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!location) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Location not found",
    });
  }

  return location.employees;
});

const updateLocationOperatingHours = withPermissions(
  "UPDATE::LOCATION",
  z.object({
    locationId: z.string(),
    bufferTime: z.number().min(0).max(60),
    prepTime: z.number().min(0).max(30),
    advanceBookingLimitDays: z.number().min(1).max(365),
    bookingCutOff: z.number().min(1).max(10080),
    downpaymentPercentage: z.number().min(0).max(100).optional(),
    cancellationPercent: z.number().min(0).max(100).optional(),
    cancellationDuration: z.number().min(1).max(10080).optional(),
    rules: z.array(
      z.object({
        day: z.number(), // 0 = Sun ... 6 = Sat
        enabled: z.boolean(),
        startMinute: z.number().optional(),
        endMinute: z.number().optional(),
      })
    ),
  })
).mutation(async ({ input }) => {
  const {
    locationId,
    rules,
    bookingCutOff,
    bufferTime,
    advanceBookingLimitDays,
    prepTime,
    downpaymentPercentage,
    cancellationPercent,
    cancellationDuration,
  } = input;
  await updateWeeklySchedule({ locationId, rules });
  await prisma.appointmentSettings.upsert({
    where: {
      locationId: locationId,
    },
    create: {
      locationId,
      bufferTime,
      prepTime,
      advanceBookingLimitDays,
      bookingCutOff,
      ...(typeof downpaymentPercentage === "number" && {
        downpaymentPercentage,
      }),
      ...(typeof cancellationPercent === "number" && { cancellationPercent }),
      ...(typeof cancellationDuration === "number" && {
        cancellationDuration,
      }),
    },
    update: {
      bufferTime,
      prepTime,
      advanceBookingLimitDays,
      bookingCutOff,
      ...(typeof downpaymentPercentage === "number" && {
        downpaymentPercentage,
      }),
      ...(typeof cancellationPercent === "number" && { cancellationPercent }),
      ...(typeof cancellationDuration === "number" && {
        cancellationDuration,
      }),
    },
  });
});

const createLocationHoliday = withPermissions(
  "UPDATE::LOCATION",
  z.object({
    locationId: z.string(),
    holiday: z.object({
      monthDay: z.string(),
      name: z.string(),
    }),
  })
).mutation(async ({ input }) => {
  const { locationId, holiday } = input;
  return await ExceptionService.createHoliday(
    locationId,
    holiday.monthDay,
    holiday.name
  );
});

const removeLocationHoliday = withPermissions(
  "UPDATE::LOCATION",
  z.object({ locationId: z.string(), holidayId: z.string() })
).mutation(async ({ input }) => {
  const { holidayId } = input;
  return await ExceptionService.deleteException(holidayId);
});

const fetchLocationHolidays = withPermissions(
  "READ::LOCATION",
  z.object({ locationId: z.string() })
).query(async ({ input }) => {
  const { locationId } = input;
  return await ExceptionService.getFullDayHolidays(locationId);
});

const fetchLocationAppointmentSettings = withPermissions(
  "READ::LOCATION",
  z.object({
    locationId: z.string(),
  })
).query(async ({ input }) => {
  const { locationId } = input;
  const [weeklySchedule, appointmentSettings] = await Promise.all([
    getWeeklySchedule(locationId),
    prisma.appointmentSettings.findUnique({
      where: { locationId },
    }),
  ]);

  return {
    weeklySchedule,
    appointmentSettings,
  };
});

const updateLocationTipSettings = withPermissions(
  "UPDATE::LOCATION",
  z.object({
    locationId: z.string(),
    tipEnabled: z.boolean(),
    tipPresetPercentages: z
      .array(z.number().int().min(1).max(100))
      .min(1)
      .max(10),
  })
).mutation(async ({ input }) => {
  const presets = [...new Set(input.tipPresetPercentages)].sort((a, b) => a - b);

  await prisma.appointmentSettings.upsert({
    where: { locationId: input.locationId },
    create: {
      locationId: input.locationId,
      tipEnabled: input.tipEnabled,
      tipPresetPercentages: presets,
    },
    update: {
      tipEnabled: input.tipEnabled,
      tipPresetPercentages: presets,
    },
  });
});

const listLocationPromoCodes = withPermissions(
  "READ::LOCATION",
  z.object({
    locationId: z.string(),
  }),
).query(async ({ input }) => {
  return prisma.promoCode.findMany({
    where: {
      locationId: input.locationId,
      appliesToLevel: "LOCATION",
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
});

const createLocationPromoCode = withPermissions(
  "UPDATE::LOCATION",
  locationPromoCodeSchema,
).mutation(async ({ input }) => {
  const location = await prisma.location.findUnique({
    where: { id: input.locationId },
    select: {
      organizationId: true,
    },
  });

  if (!location) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Location not found",
    });
  }

  try {
    return await prisma.promoCode.create({
      data: {
        code: input.code.toUpperCase(),
        description: input.description,
        discount: input.discount,
        maxUsage: input.maxUsage,
        organizationId: location.organizationId,
        locationId: input.locationId,
        appliesToLevel: "LOCATION",
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
});

const updateLocationPromoCode = withPermissions(
  "UPDATE::LOCATION",
  z.object({
    locationId: z.string(),
    promoCodeId: z.string(),
    isActive: z.boolean().optional(),
    description: z.string().trim().max(200).optional(),
    discount: z.number().int().min(1).max(100).optional(),
    maxUsage: z.number().int().min(1).max(100000).nullable().optional(),
  }),
).mutation(async ({ input }) => {
  const existing = await prisma.promoCode.findFirst({
    where: {
      id: input.promoCodeId,
      locationId: input.locationId,
      appliesToLevel: "LOCATION",
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
});

const deleteLocationPromoCode = withPermissions(
  "UPDATE::LOCATION",
  z.object({
    locationId: z.string(),
    promoCodeId: z.string(),
  }),
).mutation(async ({ input }) => {
  const existing = await prisma.promoCode.findFirst({
    where: {
      id: input.promoCodeId,
      locationId: input.locationId,
      appliesToLevel: "LOCATION",
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
});

const listOrganizationPromoCodes = withPermissions("READ::ORGANIZATION").query(
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
);

const createOrganizationPromoCode = withPermissions(
  "UPDATE::ORGANIZATION",
  organizationPromoCodeSchema,
).mutation(async ({ ctx, input }) => {
  try {
    return await prisma.promoCode.create({
      data: {
        code: input.code.toUpperCase(),
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
});

const updateOrganizationPromoCode = withPermissions(
  "UPDATE::ORGANIZATION",
  z.object({
    promoCodeId: z.string(),
    isActive: z.boolean().optional(),
    description: z.string().trim().max(200).optional(),
    discount: z.number().int().min(1).max(100).optional(),
    maxUsage: z.number().int().min(1).max(100000).nullable().optional(),
  }),
).mutation(async ({ ctx, input }) => {
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
});

const deleteOrganizationPromoCode = withPermissions(
  "UPDATE::ORGANIZATION",
  z.object({
    promoCodeId: z.string(),
  }),
).mutation(async ({ ctx, input }) => {
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
});

export const locationRouter = router({
  createLocation: createLocation,
  getAllLocations,
  getLocation,
  getLocationEmployees,
  updateLocationOperatingHours,
  updateLocationTipSettings,
  fetchLocationAppointmentSettings,
  createLocationHoliday,
  fetchLocationHolidays,
  removeLocationHoliday,
  listLocationPromoCodes,
  createLocationPromoCode,
  updateLocationPromoCode,
  deleteLocationPromoCode,
  listOrganizationPromoCodes,
  createOrganizationPromoCode,
  updateOrganizationPromoCode,
  deleteOrganizationPromoCode,
});
