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
import { buffer } from "stream/consumers";

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

const updateLocationOperatingHours = withPermissions(
  "UPDATE::LOCATION",
  z.object({
    locationId: z.string(),
    bufferTime: z.number().min(0).max(60),
    prepTime: z.number().min(0).max(30),
    advanceBookingLimitDays: z.number().min(1).max(365),
    bookingCutOff: z.number().min(1).max(10080),
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
    },
    update: {
      bufferTime,
      prepTime,
      advanceBookingLimitDays,
      bookingCutOff,
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

export const locationRouter = router({
  createLocation: createLocation,
  getAllLocations,
  getLocation,
  updateLocationOperatingHours,
  fetchLocationAppointmentSettings,
  createLocationHoliday,
  fetchLocationHolidays,
  removeLocationHoliday,
});
