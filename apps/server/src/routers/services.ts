import z from "zod";
import { withPermissions } from "../lib/trpc";
import prisma from "../../prisma";
import { getServices } from "../lib/service/group";
import { ACTIVITY_LOG_ACTIONS, addActivityLog } from "../lib/activitylogs";

const fiveMinuteIncrement = (fieldLabel: string, minValue: number) =>
  z
    .number()
    .int()
    .min(minValue)
    .refine((value) => value % 5 === 0, {
      message: `${fieldLabel} must be a multiple of 5 minutes`,
    });

const durationSchema = fiveMinuteIncrement("Duration", 5);
const optionalDurationSchema = fiveMinuteIncrement("Duration", 5).optional();
const prepTimeSchema = fiveMinuteIncrement("Prep time", 0);
const bufferTimeSchema = fiveMinuteIncrement("Buffer time", 0);
const optionalPrepTimeSchema = prepTimeSchema.optional();
const optionalBufferTimeSchema = bufferTimeSchema.optional();

const createServiceTerms = withPermissions(
  "CREATE::SERVICES_TERMS",
  z.object({
    name: z.string(),
    description: z.string().optional(),
    groupId: z.string(),
    minPrice: z.number(),
    excerpt: z.string(),
  }),
).mutation(async ({ ctx, input }) => {
  const { name, description, minPrice, groupId, excerpt } = input;

  await prisma.serviceTerms.create({
    data: {
      minimumPrice: minPrice * 100, // Convert dollars to cents
      name: name,
      description,
      excerpt,
      organizationId: ctx.orgWithSub.id,
      serviceGroupId: groupId,
    },
  });
});

const createServiceGroup = withPermissions(
  "CREATE::SERVICES_GROUP",
  z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
).mutation(async ({ ctx, input }) => {
  const { name, description } = input;

  await prisma.serviceGroup.create({
    data: {
      name: name,
      description,
      organizationId: ctx.orgWithSub.id,
    },
  });

  addActivityLog({
    type: ACTIVITY_LOG_ACTIONS.CREATED_SERVICE_GROUP,
    description: `Service group ${name} was created.`,
    userId: ctx.session.user.id,
    organizationId: ctx.session.user.organizationId,
  });
});

const createService = withPermissions(
  "CREATE::SERVICE",
  z.object({
    duration: durationSchema,
    description: z.string().optional(),
    price: z.number(),
    termId: z.string(),
    locationId: z.string(),
    locationEmployeeId: z.string(),
  }),
).mutation(async ({ ctx, input }) => {
  const { duration, price, termId, locationEmployeeId } = input;
  await prisma.employeeService.create({
    data: {
      duration,
      price,
      serviceId: termId,
      locationId: input.locationId,
      locationEmployeeId,
    },
  });
});

const deleteServiceTerm = withPermissions(
  "DELETE::SERVICE",
  z.object({
    serviceId: z.string(),
  }),
).mutation(async ({ ctx, input }) => {
  const { serviceId } = input;
  await prisma.serviceTerms.delete({
    where: {
      id: serviceId,
      organizationId: ctx.orgWithSub.id,
    },
  });
});

const getAllServicesTerms = withPermissions([
  "READ::SERVICES_TERMS",
  "READ::SERVICES_GROUP",
]).query(({ ctx }) => {
  return getServices({ organizationId: ctx.orgWithSub.id });
});

const getAllGroups = withPermissions("READ::SERVICES_GROUP").query(
  async ({ ctx }) => {
    return await prisma.serviceGroup.findMany({
      select: {
        id: true,
        name: true,
      },
      where: {
        organizationId: ctx.orgWithSub.id,
      },
    });
  },
);
const getEmployeeServices = withPermissions(
  "READ::SERVICES_TERMS",
  z.object({
    locationEmployeeId: z.string(),
    locationId: z.string(),
  }),
).query(async ({ input }) => {
  const { locationEmployeeId, locationId } = input;
  return await prisma.employeeService.findMany({
    where: {
      locationEmployeeId,
      locationId,
      isActive: true,
    },
    select: {
      addOns: {
        select: {
          id: true,
          name: true,
          basePrice: true,
          incrementalDuration: true,
        },
      },
      serviceTerms: {
        select: {
          id: true,
          name: true,
          excerpt: true,
        },
      },
      id: true,
      duration: true,
      price: true,
      locationEmployeeId: true,
    },
  });
});

// New procedures for LOCATION_SPECIALIST
const getMyLocationEmployee = withPermissions(
  "READ::SERVICE",
  z.object({
    locationId: z.string(),
  }),
).query(async ({ ctx, input }) => {
  const { locationId } = input;
  return await prisma.locationEmployee.findFirst({
    where: {
      userId: ctx.session.user.id,
      locationId,
    },
    select: {
      id: true,
      role: true,
      locationId: true,
      location: {
        select: {
          id: true,
          name: true,
          organizationId: true,
        },
      },
    },
  });
});

const getAvailableServiceTerms = withPermissions(
  "READ::SERVICES_TERMS",
  z.object({
    locationId: z.string(),
  }),
).query(async ({ ctx, input }) => {
  const { locationId } = input;

  // Get location to find organizationId
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { organizationId: true },
  });

  if (!location) {
    throw new Error("Location not found");
  }

  return await prisma.serviceTerms.findMany({
    where: {
      organizationId: location.organizationId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      excerpt: true,
      minimumPrice: true,
      serviceGroup: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
});

const getMyServices = withPermissions(
  "READ::SERVICE",
  z.object({
    locationId: z.string(),
  }),
).query(async ({ ctx, input }) => {
  const { locationId } = input;

  // First get the LocationEmployee record
  const locationEmployee = await prisma.locationEmployee.findFirst({
    where: {
      userId: ctx.session.user.id,
      locationId,
    },
  });

  if (!locationEmployee) {
    return [];
  }

  return await prisma.employeeService.findMany({
    where: {
      locationEmployeeId: locationEmployee.id,
      locationId,
    },
    select: {
      id: true,
      duration: true,
      price: true,
      bufferTime: true,
      prepTime: true,
      isActive: true,
      serviceTerms: {
        select: {
          id: true,
          name: true,
          description: true,
          excerpt: true,
          minimumPrice: true,
          serviceGroup: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
});

const createMyService = withPermissions(
  "CREATE::SERVICE",
  z.object({
    serviceTermId: z.string(),
    price: z.number().min(0),
    duration: durationSchema,
    bufferTime: bufferTimeSchema.default(0),
    prepTime: prepTimeSchema.default(0),
    locationId: z.string(),
  }),
).mutation(async ({ ctx, input }) => {
  const { serviceTermId, price, duration, bufferTime, prepTime, locationId } =
    input;

  // Get the LocationEmployee record
  const locationEmployee = await prisma.locationEmployee.findFirst({
    where: {
      userId: ctx.session.user.id,
      locationId,
    },
  });

  if (!locationEmployee) {
    throw new Error("You are not an employee at this location");
  }

  // Check if service already exists
  const existingService = await prisma.employeeService.findFirst({
    where: {
      serviceId: serviceTermId,
      locationEmployeeId: locationEmployee.id,
      locationId,
    },
  });

  if (existingService) {
    throw new Error("You have already configured this service");
  }

  // Verify the service term exists and get minimum price
  const serviceTerm = await prisma.serviceTerms.findUnique({
    where: { id: serviceTermId },
    select: { minimumPrice: true },
  });

  if (!serviceTerm) {
    throw new Error("Service term not found");
  }

  if (price < serviceTerm.minimumPrice) {
    throw new Error(
      `Price must be at least $${serviceTerm.minimumPrice / 100}`,
    );
  }

  return await prisma.employeeService.create({
    data: {
      serviceId: serviceTermId,
      locationEmployeeId: locationEmployee.id,
      locationId,
      price,
      duration,
      bufferTime: bufferTime ?? 0,
      prepTime: prepTime ?? 0,
    },
    select: {
      id: true,
      duration: true,
      price: true,
      bufferTime: true,
      prepTime: true,
      serviceTerms: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
});

const updateMyService = withPermissions(
  "UPDATE::SERVICE",
  z.object({
    serviceId: z.string(),
    price: z.number().min(0).optional(),
    duration: optionalDurationSchema,
    bufferTime: optionalBufferTimeSchema,
    prepTime: optionalPrepTimeSchema,
    isActive: z.boolean().optional(),
    locationId: z.string(),
  }),
).mutation(async ({ ctx, input }) => {
  const { serviceId, price, duration, bufferTime, prepTime, isActive, locationId } =
    input;

  // Get the LocationEmployee record
  const locationEmployee = await prisma.locationEmployee.findFirst({
    where: {
      userId: ctx.session.user.id,
      locationId,
    },
  });

  if (!locationEmployee) {
    throw new Error("You are not an employee at this location");
  }

  // Verify the service belongs to this employee
  const employeeService = await prisma.employeeService.findFirst({
    where: {
      id: serviceId,
      locationEmployeeId: locationEmployee.id,
    },
    include: {
      serviceTerms: {
        select: {
          minimumPrice: true,
        },
      },
    },
  });

  if (!employeeService) {
    throw new Error("Service not found or you don't have permission to edit it");
  }

  // Validate price if being updated
  if (price !== undefined && price < employeeService.serviceTerms.minimumPrice) {
    throw new Error(
      `Price must be at least $${employeeService.serviceTerms.minimumPrice / 100}`,
    );
  }

  return await prisma.employeeService.update({
    where: {
      id: serviceId,
    },
    data: {
      ...(price !== undefined && { price }),
      ...(duration !== undefined && { duration }),
      ...(bufferTime !== undefined && { bufferTime }),
      ...(prepTime !== undefined && { prepTime }),
      ...(isActive !== undefined && { isActive }),
    },
    select: {
      id: true,
      duration: true,
      price: true,
      bufferTime: true,
      prepTime: true,
      isActive: true,
      serviceTerms: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
});

export const servicesRouter = {
  createServiceTerms,
  deleteServiceTerm,
  createServiceGroup,
  createService,
  getAllServicesTerms,
  getAllGroups,
  getEmployeeServices,
  // New procedures for specialists
  getMyLocationEmployee,
  getAvailableServiceTerms,
  getMyServices,
  createMyService,
  updateMyService,
};
