import z from "zod";
import { withPermissions } from "../lib/trpc";
import prisma from "../../prisma";
import { getServices } from "../lib/service/group";
import { ACTIVITY_LOG_ACTIONS, addActivityLog } from "../lib/activitylogs";
import { maskEmail } from "../lib/helpers/utils";

const createServiceTerms = withPermissions(
  "CREATE::SERVICES_TERMS",
  z.object({
    name: z.string(),
    description: z.string().optional(),
    groupId: z.string(),
    minPrice: z.number(),
    excerpt: z.string(),
  })
).mutation(async ({ ctx, input }) => {
  const { name, description, minPrice, groupId, excerpt } = input;

  await prisma.serviceTerms.create({
    data: {
      minimumPrice: minPrice,
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
  })
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
    duration: z.number(),
    description: z.string().optional(),
    price: z.number(),
    termId: z.string(),
    locationId: z.string(),
    locationEmployeeId: z.string(),
  })
).mutation(async ({ ctx, input }) => {
  const { duration, description, price, termId, locationEmployeeId } = input;
  await prisma.service.create({
    data: {
      duration,
      price,
      serviceId: termId,
      locationId: input.locationId,
      locationEmployeeId,
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
  }
);

export const servicesRouter = {
  createServiceTerms,
  createServiceGroup,
  createService,
  getAllServicesTerms,
  getAllGroups,
};
