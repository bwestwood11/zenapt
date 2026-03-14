import z from "zod";
import { router, withPermissions } from "../lib/trpc";
import prisma from "../../prisma";
import { TRPCError } from "@trpc/server";

import { isValidPhoneNumber } from "libphonenumber-js";
import { revalidateTag } from "next/cache";
import {
  getEmployeeRecurringBreaks,
  getEmployeeWeeklySchedule,
  getLocationRecurringBreaks,
  getWeeklySchedule,
  replaceRecurringBreaksByTarget,
  updateEmployeeWeeklySchedule,
  updateWeeklySchedule,
  type WeeklyScheduleView,
} from "../lib/locations/operating-hours";
import { ExceptionService } from "../lib/appointment/holidays";
import { ACTIVITY_LOG_ACTIONS, addActivityLog } from "../lib/activitylogs";
import {
  getMinutesInTimeZone,
  getZonedDateParts,
  getZonedDayRangeUtc,
  zonedDateTimeToUtc,
} from "../lib/datetime/timezone";
import { LeaveRequestStatus, ScheduleTargetType } from "../../prisma/generated/enums";

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

const weeklyScheduleRulesSchema = z.array(
  z.object({
    day: z.number(), // 0 = Sun ... 6 = Sat
    enabled: z.boolean(),
    startMinute: z.number().optional(),
    endMinute: z.number().optional(),
  }),
);

const leaveRequestInputSchema = z.object({
  locationId: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  reason: z.string().trim().max(500).optional(),
});

const leaveRequestConfigSchema = z.object({
  locationId: z.string(),
  leaveRequestNoticeDays: z.number().int().min(0).max(60),
});

const APPROVER_ROLES = new Set([
  "LOCATION_FRONT_DESK",
  "LOCATION_ADMIN",
  "ORGANIZATION_MANAGEMENT",
] as const);

function getLocationRole(
  ctx: {
    session: {
      user: {
        employees?:
          | {
              locationId: string;
              role: string;
            }[]
          | null;
      };
    };
  },
  locationId: string,
) {
  return ctx.session.user.employees?.find(
    (employee) => employee.locationId === locationId,
  )?.role;
}

function assertApproverRole(role: string | undefined) {
  if (
    !role ||
    !APPROVER_ROLES.has(
      role as "LOCATION_FRONT_DESK" | "LOCATION_ADMIN" | "ORGANIZATION_MANAGEMENT",
    )
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only front desk or location admin can perform this action",
    });
  }
}

function normalizeLeaveRequestRange(
  startDate: Date,
  endDate: Date,
  timeZone: string,
) {
  const rawStartMs = startDate.getTime();
  const rawEndMs = endDate.getTime();

  const intendedDayCount = Math.max(
    1,
    Math.ceil((rawEndMs - rawStartMs + 1) / (24 * 60 * 60 * 1000)),
  );

  const startParts = getZonedDateParts(startDate, timeZone);

  const buildCandidateRange = (startDayOffset: number) => {
    const candidateStartRef = new Date(
      Date.UTC(
        startParts.year,
        startParts.month - 1,
        startParts.day + startDayOffset,
      ),
    );

    const candidateStart = zonedDateTimeToUtc(timeZone, {
      year: candidateStartRef.getUTCFullYear(),
      month: candidateStartRef.getUTCMonth() + 1,
      day: candidateStartRef.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
    });

    const candidateEndExclusiveRef = new Date(
      Date.UTC(
        candidateStartRef.getUTCFullYear(),
        candidateStartRef.getUTCMonth(),
        candidateStartRef.getUTCDate() + intendedDayCount,
      ),
    );

    const candidateEndExclusive = zonedDateTimeToUtc(timeZone, {
      year: candidateEndExclusiveRef.getUTCFullYear(),
      month: candidateEndExclusiveRef.getUTCMonth() + 1,
      day: candidateEndExclusiveRef.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
    });

    const candidateEnd = new Date(candidateEndExclusive.getTime() - 1);

    const overlap = Math.max(
      0,
      Math.min(candidateEnd.getTime(), rawEndMs) -
        Math.max(candidateStart.getTime(), rawStartMs) +
        1,
    );

    return {
      startDate: candidateStart,
      endDate: candidateEnd,
      overlap,
    };
  };

  const candidates = [buildCandidateRange(0), buildCandidateRange(1)];
  const bestCandidate = candidates.sort(
    (left, right) => right.overlap - left.overlap,
  )[0];

  return {
    normalizedStartDate: bestCandidate.startDate,
    normalizedEndDate: bestCandidate.endDate,
  };
}

const recurringBreakRuleSchema = z
  .object({
    day: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
  })
  .refine((value) => value.endMinute > value.startMinute, {
    message: "Break end time must be after the start time",
  });

const recurringBreakRulesSchema = z
  .array(recurringBreakRuleSchema)
  .max(50, "You can save up to 50 recurring breaks per target")
  .superRefine((breaks, ctx) => {
    const breakGroups = new Map<number, typeof breaks>();

    for (const currentBreak of breaks) {
      const dayBreaks = breakGroups.get(currentBreak.day) ?? [];
      dayBreaks.push(currentBreak);
      breakGroups.set(currentBreak.day, dayBreaks);
    }

    for (const [day, dayBreaks] of breakGroups) {
      const sortedBreaks = [...dayBreaks].sort(
        (left, right) => left.startMinute - right.startMinute,
      );

      for (let index = 1; index < sortedBreaks.length; index++) {
        const previousBreak = sortedBreaks[index - 1];
        const currentBreak = sortedBreaks[index];

        if (currentBreak.startMinute < previousBreak.endMinute) {
          ctx.addIssue({
            code: "custom",
            message: `Recurring breaks overlap on day ${day}`,
          });
          break;
        }
      }
    }
  });

const MANAGE_BREAKS_ROLES = new Set([
  "ORGANIZATION_MANAGEMENT",
  "LOCATION_ADMIN",
  "LOCATION_FRONT_DESK",
]);

const LOCATION_EMPLOYEE_ROLE_ORDER: Record<string, number> = {
  ORGANIZATION_MANAGEMENT: 0,
  LOCATION_ADMIN: 1,
  LOCATION_FRONT_DESK: 2,
  LOCATION_SPECIALIST: 3,
};

function formatMinuteRange(startMinute: number, endMinute: number) {
  const toTimeLabel = (minute: number) => {
    const hours = Math.floor(minute / 60);
    const minutes = minute % 60;
    const suffix = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;

    return `${displayHour}:${minutes.toString().padStart(2, "0")} ${suffix}`;
  };

  return `${toTimeLabel(startMinute)} - ${toTimeLabel(endMinute)}`;
}

function getRecurringBreakManager(
  employees:
    | Array<{
        locationId: string;
        role: string;
      }>
    | null
    | undefined,
  locationId: string,
) {
  const locationEmployee = employees?.find(
    (employee) => employee.locationId === locationId,
  );

  if (!locationEmployee || !MANAGE_BREAKS_ROLES.has(locationEmployee.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only location managers and front desk staff can manage recurring breaks.",
    });
  }

  return locationEmployee;
}

function assertRecurringBreaksFitSchedule(
  rules: z.infer<typeof recurringBreakRulesSchema>,
  weeklySchedule: WeeklyScheduleView[],
) {
  const scheduleByDay = new Map(weeklySchedule.map((rule) => [rule.day, rule]));

  for (const rule of rules) {
    const workDay = scheduleByDay.get(rule.day);

    if (
      !workDay?.enabled ||
      workDay.startMinute == null ||
      workDay.endMinute == null
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot add a recurring break on a day without working hours.`,
      });
    }

    if (
      rule.startMinute < workDay.startMinute ||
      rule.endMinute > workDay.endMinute
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Recurring break ${formatMinuteRange(rule.startMinute, rule.endMinute)} must stay inside ${formatMinuteRange(workDay.startMinute, workDay.endMinute)}.`,
      });
    }
  }
}

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

  revalidateTag(ctx.orgWithSub.id);

  addActivityLog({
    type: ACTIVITY_LOG_ACTIONS.CREATED_LOCATION,
    description: `Location ${createdLocation.name} was created.`,
    userId: ctx.session.user.id,
    organizationId: ctx.orgWithSub.id,
    locationId: createdLocation.id,
  });

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
    rules: weeklyScheduleRulesSchema,
  })
).mutation(async ({ ctx, input }) => {
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

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { name: true, organizationId: true },
  });

  addActivityLog({
    type: ACTIVITY_LOG_ACTIONS.UPDATED_LOCATION_OPERATING_HOURS,
    description: `Operating hours were updated for location ${location?.name ?? locationId}.`,
    userId: ctx.session.user.id,
    organizationId: location?.organizationId ?? ctx.session.user.organizationId,
    locationId,
  });
});

const fetchMyWorkingHours = withPermissions(
  "READ::LOCATION",
  z.object({
    locationId: z.string(),
  }),
).query(async ({ ctx, input }) => {
  const specialist = await prisma.locationEmployee.findFirst({
    where: {
      locationId: input.locationId,
      userId: ctx.session.user.id,
      role: "LOCATION_SPECIALIST",
    },
    select: {
      id: true,
    },
  });

  if (!specialist) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only specialists can access their working hours",
    });
  }

  const weeklySchedule = await getEmployeeWeeklySchedule(
    specialist.id,
    input.locationId,
  );

  return {
    weeklySchedule,
  };
});

const updateMyWorkingHours = withPermissions(
  "READ::LOCATION",
  z.object({
    locationId: z.string(),
    rules: weeklyScheduleRulesSchema,
  }),
).mutation(async ({ ctx, input }) => {
  const specialist = await prisma.locationEmployee.findFirst({
    where: {
      locationId: input.locationId,
      userId: ctx.session.user.id,
      role: "LOCATION_SPECIALIST",
    },
    select: {
      id: true,
      location: {
        select: {
          organizationId: true,
        },
      },
    },
  });

  if (!specialist) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only specialists can update their working hours",
    });
  }

  await updateEmployeeWeeklySchedule({
    locationEmployeeId: specialist.id,
    rules: input.rules,
  });

  addActivityLog({
    type: ACTIVITY_LOG_ACTIONS.UPDATED_LOCATION_OPERATING_HOURS,
    description: `Specialist working hours were updated for location ${input.locationId}.`,
    userId: ctx.session.user.id,
    organizationId:
      specialist.location.organizationId ?? ctx.session.user.organizationId,
    locationId: input.locationId,
  });

  return { success: true };
});

const checkMyWorkingHoursImpact = withPermissions(
  "READ::LOCATION",
  z.object({
    locationId: z.string(),
    rules: weeklyScheduleRulesSchema,
  }),
).query(async ({ ctx, input }) => {
  const specialist = await prisma.locationEmployee.findFirst({
    where: {
      locationId: input.locationId,
      userId: ctx.session.user.id,
      role: "LOCATION_SPECIALIST",
    },
    select: {
      id: true,
      location: {
        select: {
          timeZone: true,
        },
      },
    },
  });

  if (!specialist) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only specialists can check working hours impact",
    });
  }

  const locationTimeZone = specialist.location.timeZone || "UTC";
  const rangeStart = new Date();
  const rangeEnd = new Date(rangeStart.getTime() + 31 * 24 * 60 * 60 * 1000);
  const locationWeeklySchedule = await getWeeklySchedule(input.locationId);

  const appointments = await prisma.appointment.findMany({
    where: {
      locationId: input.locationId,
      startTime: {
        gte: rangeStart,
        lt: rangeEnd,
      },
      status: {
        in: ["SCHEDULED", "RESCHEDULED"],
      },
      service: {
        some: {
          locationEmployeeId: specialist.id,
        },
      },
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      customer: {
        select: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      startTime: "asc",
    },
  });

  const specialistRuleByDay = new Map(input.rules.map((rule) => [rule.day, rule]));
  const locationRuleByDay = new Map(
    locationWeeklySchedule.map((rule) => [rule.day, rule]),
  );

  const affectedAppointments = appointments.filter((appointment) => {
    const zoned = getZonedDateParts(appointment.startTime, locationTimeZone);
    const day = new Date(
      Date.UTC(zoned.year, zoned.month - 1, zoned.day),
    ).getUTCDay();

    const dayRule =
      specialistRuleByDay.get(day) ??
      locationRuleByDay.get(day) ?? {
        day,
        enabled: false,
      };
    if (!dayRule?.enabled) {
      return true;
    }

    const startMinute = getMinutesInTimeZone(
      appointment.startTime,
      locationTimeZone,
    );
    const endMinute = getMinutesInTimeZone(
      appointment.endTime,
      locationTimeZone,
    );

    if (dayRule.startMinute == null || dayRule.endMinute == null) {
      return true;
    }

    return startMinute < dayRule.startMinute || endMinute > dayRule.endMinute;
  });

  return {
    affectedCount: affectedAppointments.length,
    appointments: affectedAppointments.map((appointment) => ({
      id: appointment.id,
      customerName: appointment.customer.user.name,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
    })),
  };
});

const getLeaveRequestConfig = withPermissions(
  "READ::EMPLOYEES",
  z.object({ locationId: z.string() }),
).query(async ({ input }) => {
  const settings = await prisma.appointmentSettings.findUnique({
    where: { locationId: input.locationId },
    select: { leaveRequestNoticeDays: true },
  });

  return {
    leaveRequestNoticeDays: settings?.leaveRequestNoticeDays ?? 1,
  };
});

const updateLeaveRequestConfig = withPermissions(
  "READ::EMPLOYEES",
  leaveRequestConfigSchema,
).mutation(async ({ ctx, input }) => {
  const role = getLocationRole(ctx, input.locationId);
  assertApproverRole(role);

  await prisma.appointmentSettings.upsert({
    where: { locationId: input.locationId },
    create: {
      locationId: input.locationId,
      leaveRequestNoticeDays: input.leaveRequestNoticeDays,
    },
    update: {
      leaveRequestNoticeDays: input.leaveRequestNoticeDays,
    },
  });

  return { success: true };
});

const createMyLeaveRequest = withPermissions(
  "READ::EMPLOYEES",
  leaveRequestInputSchema,
).mutation(async ({ ctx, input }) => {
  const role = getLocationRole(ctx, input.locationId);

  if (role !== "LOCATION_SPECIALIST") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only specialists can request leave",
    });
  }

  if (input.startDate > input.endDate) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Start date must be before or equal to end date",
    });
  }

  const specialist = await prisma.locationEmployee.findFirst({
    where: {
      locationId: input.locationId,
      userId: ctx.session.user.id,
      role: "LOCATION_SPECIALIST",
    },
    select: {
      id: true,
      location: {
        select: {
          timeZone: true,
        },
      },
    },
  });

  if (!specialist) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Specialist record not found for this location",
    });
  }

  const settings = await prisma.appointmentSettings.findUnique({
    where: { locationId: input.locationId },
    select: { leaveRequestNoticeDays: true },
  });

  const noticeDays = settings?.leaveRequestNoticeDays ?? 1;
  const locationTimeZone = specialist.location.timeZone || "UTC";
  const now = new Date();

  const { normalizedStartDate, normalizedEndDate } = normalizeLeaveRequestRange(
    input.startDate,
    input.endDate,
    locationTimeZone,
  );

  if (normalizedStartDate > normalizedEndDate) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Start date must be before or equal to end date",
    });
  }

  const { year, month, day } = getZonedDayRangeUtc(now, locationTimeZone);
  const thresholdRef = new Date(Date.UTC(year, month - 1, day + noticeDays));
  const thresholdDate = zonedDateTimeToUtc(locationTimeZone, {
    year: thresholdRef.getUTCFullYear(),
    month: thresholdRef.getUTCMonth() + 1,
    day: thresholdRef.getUTCDate(),
    hour: 0,
    minute: 0,
    second: 0,
  });


  console.log("Leave request threshold date:", thresholdDate.toISOString());
  console.log("Normalized leave request start date:", normalizedStartDate.toISOString());
  console.log("Normalized leave request end date:", normalizedEndDate.toISOString());

  if (normalizedStartDate < thresholdDate) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Leave must be requested at least ${noticeDays} day(s) in advance`,
    });
  }

  const overlapTimeOff = await prisma.timeOff.findFirst({
    where: {
      targetType: ScheduleTargetType.EMPLOYEE,
      targetId: specialist.id,
      startDate: { lte: normalizedEndDate },
      endDate: { gte: normalizedStartDate },
    },
    select: { id: true },
  });

  if (overlapTimeOff) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This leave overlaps with an existing approved time off",
    });
  }

  const overlapRequest = await prisma.leaveRequest.findFirst({
    where: {
      locationEmployeeId: specialist.id,
      status: {
        in: [LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED],
      },
      startDate: { lte: normalizedEndDate },
      endDate: { gte: normalizedStartDate },
    },
    select: { id: true },
  });

  if (overlapRequest) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This leave overlaps with an existing request",
    });
  }

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      locationId: input.locationId,
      locationEmployeeId: specialist.id,
      requestedById: ctx.session.user.id,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      reason: input.reason,
      status: LeaveRequestStatus.PENDING,
    },
  });

  return { id: leaveRequest.id, success: true };
});

const getMyLeaveRequests = withPermissions(
  "READ::EMPLOYEES",
  z.object({ locationId: z.string() }),
).query(async ({ ctx, input }) => {
  const specialist = await prisma.locationEmployee.findFirst({
    where: {
      locationId: input.locationId,
      userId: ctx.session.user.id,
      role: "LOCATION_SPECIALIST",
    },
    select: { id: true },
  });

  if (!specialist) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only specialists can view their leave requests",
    });
  }

  return prisma.leaveRequest.findMany({
    where: {
      locationId: input.locationId,
      locationEmployeeId: specialist.id,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      reason: true,
      reviewNote: true,
      status: true,
      reviewedAt: true,
      createdAt: true,
      reviewedBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
});

const getLocationLeaveRequests = withPermissions(
  "READ::EMPLOYEES",
  z.object({
    locationId: z.string(),
    status: z.enum(LeaveRequestStatus).optional(),
  }),
).query(async ({ ctx, input }) => {
  const role = getLocationRole(ctx, input.locationId);
  assertApproverRole(role);

  return prisma.leaveRequest.findMany({
    where: {
      locationId: input.locationId,
      ...(input.status ? { status: input.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      reason: true,
      reviewNote: true,
      status: true,
      reviewedAt: true,
      createdAt: true,
      locationEmployee: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      reviewedBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
});

const reviewLeaveRequest = withPermissions(
  "READ::EMPLOYEES",
  z.object({
    locationId: z.string(),
    requestId: z.string(),
    action: z.enum(["APPROVE", "DECLINE"]),
    reviewNote: z.string().trim().max(500).optional(),
  }),
).mutation(async ({ ctx, input }) => {
  const role = getLocationRole(ctx, input.locationId);
  assertApproverRole(role);

  const request = await prisma.leaveRequest.findFirst({
    where: {
      id: input.requestId,
      locationId: input.locationId,
    },
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      reason: true,
      locationEmployeeId: true,
    },
  });

  if (!request) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Leave request not found",
    });
  }

  if (request.status !== LeaveRequestStatus.PENDING) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only pending requests can be reviewed",
    });
  }

  if (input.action === "APPROVE") {
    const overlapTimeOff = await prisma.timeOff.findFirst({
      where: {
        targetType: ScheduleTargetType.EMPLOYEE,
        targetId: request.locationEmployeeId,
        startDate: { lte: request.endDate },
        endDate: { gte: request.startDate },
      },
      select: { id: true },
    });

    if (overlapTimeOff) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot approve because approved time off already overlaps this request",
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: request.id },
      data: {
        status:
          input.action === "APPROVE"
            ? LeaveRequestStatus.APPROVED
            : LeaveRequestStatus.DECLINED,
        reviewedById: ctx.session.user.id,
        reviewedAt: new Date(),
        reviewNote: input.reviewNote,
      },
    });

    if (input.action === "APPROVE") {
      await tx.timeOff.create({
        data: {
          targetType: ScheduleTargetType.EMPLOYEE,
          targetId: request.locationEmployeeId,
          startDate: request.startDate,
          endDate: request.endDate,
          reason: request.reason || "Approved leave request",
        },
      });
    }
  });

  return { success: true };
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

const fetchRecurringBreakSettings = withPermissions(
  "READ::EMPLOYEES",
  z.object({
    locationId: z.string(),
  }),
).query(async ({ ctx, input }) => {
  getRecurringBreakManager(ctx.session.user.employees, input.locationId);

  const location = await prisma.location.findUnique({
    where: {
      id: input.locationId,
    },
    select: {
      id: true,
      name: true,
      timeZone: true,
      employees: {
        where: {
          role: "LOCATION_SPECIALIST",
        },
        select: {
          id: true,
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
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


  try {
    

  const [locationWeeklySchedule, locationBreaks, employees] = await Promise.all([
    getWeeklySchedule(input.locationId),
    getLocationRecurringBreaks(input.locationId),
    Promise.all(
      location.employees.map(async (employee) => ({
        id: employee.id,
        role: employee.role,
        user: employee.user,
        weeklySchedule: await getEmployeeWeeklySchedule(employee.id, input.locationId),
        breaks: await getEmployeeRecurringBreaks(employee.id),
      })),
    ),
  ]);

  const sortedEmployees = [...employees].sort((left, right) => {
    const leftRoleOrder = LOCATION_EMPLOYEE_ROLE_ORDER[left.role] ?? 99;
    const rightRoleOrder = LOCATION_EMPLOYEE_ROLE_ORDER[right.role] ?? 99;

    if (leftRoleOrder !== rightRoleOrder) {
      return leftRoleOrder - rightRoleOrder;
    }

    return left.user.name.localeCompare(right.user.name);
  });

  return {
    location: {
      id: location.id,
      name: location.name,
      timeZone: location.timeZone,
      weeklySchedule: locationWeeklySchedule,
      breaks: locationBreaks,
    },
    employees: sortedEmployees,
  };
    } catch (error) {
      console.error("Error fetching recurring break settings:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred while fetching recurring break settings.",
      });
  } 
});

const updateRecurringBreaks = withPermissions(
  "READ::EMPLOYEES",
  z
    .object({
      locationId: z.string(),
      targetType: z.enum(["LOCATION", "EMPLOYEE"]),
      locationEmployeeId: z.string().optional(),
      breaks: recurringBreakRulesSchema,
    })
    .superRefine((value, ctx) => {
      if (value.targetType === "EMPLOYEE" && !value.locationEmployeeId) {
        ctx.addIssue({
          code: "custom",
          path: ["locationEmployeeId"],
          message: "Employee target requires a location employee id",
        });
      }
    }),
).mutation(async ({ ctx, input }) => {
  getRecurringBreakManager(ctx.session.user.employees, input.locationId);

  const location = await prisma.location.findUnique({
    where: { id: input.locationId },
    select: {
      id: true,
      name: true,
      organizationId: true,
    },
  });

  if (!location) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Location not found",
    });
  }

  let targetType: ScheduleTargetType = ScheduleTargetType.LOCATION;
  let targetId = input.locationId;
  let targetName = location.name;
  let targetLabel = `location ${location.name}`;
  let weeklySchedule = await getWeeklySchedule(input.locationId);

  if (input.targetType === "EMPLOYEE") {
    const employee = await prisma.locationEmployee.findFirst({
      where: {
        id: input.locationEmployeeId,
        locationId: input.locationId,
      },
      select: {
        id: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!employee) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Employee not found for this location",
      });
    }

    targetType = ScheduleTargetType.EMPLOYEE;
    targetId = employee.id;
    targetName = employee.user.name;
    targetLabel = `employee ${employee.user.name}`;
    weeklySchedule = await getEmployeeWeeklySchedule(employee.id, input.locationId);
  }

  assertRecurringBreaksFitSchedule(input.breaks, weeklySchedule);

  await replaceRecurringBreaksByTarget({
    targetType,
    targetId,
    rules: input.breaks,
  });

  addActivityLog({
    type: ACTIVITY_LOG_ACTIONS.UPDATED_LOCATION_OPERATING_HOURS,
    description: `Recurring breaks were updated for ${targetLabel}.`,
    userId: ctx.session.user.id,
    organizationId: location.organizationId,
    locationId: location.id,
  });

  return {
    success: true,
    targetName,
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
  fetchMyWorkingHours,
  updateMyWorkingHours,
  checkMyWorkingHoursImpact,
  getLeaveRequestConfig,
  updateLeaveRequestConfig,
  createMyLeaveRequest,
  getMyLeaveRequests,
  getLocationLeaveRequests,
  reviewLeaveRequest,
  updateLocationTipSettings,
  fetchLocationAppointmentSettings,
  fetchRecurringBreakSettings,
  updateRecurringBreaks,
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
