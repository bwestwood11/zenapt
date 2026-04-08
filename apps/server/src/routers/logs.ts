import { z } from "zod";
import prisma from "../../prisma";
import { router, withPermissions } from "../lib/trpc";
import { Prisma } from "@prisma/client";

const filters = z.object({
  actions: z.array(z.string()).optional(),
  userId: z.string().optional(),
});

export const getOrganizationLogs = withPermissions(
  "READ::ORGANIZATION",
  z.object({
    page: z.number().default(1),
    limit: z.number().default(15),
    filters: filters.optional(),
  })
).query(async ({ ctx, input }) => {
  const { page, limit, filters } = input;
  const skip = (page - 1) * limit;

  const where: Prisma.ActivityLogWhereInput = {
    organizationId: ctx.orgWithSub.id,
    locationId: null,
  };

  if (filters?.actions?.length && !filters.actions.includes("all")) {
    where.action = { in: filters.actions };
  }

  if (filters?.userId) {
    where.userId = filters.userId;
  }

  console.log(filters);

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } }, // optional but nice
      },
    }),
    prisma.activityLog.count({ where }), // count must match the same filters!
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    logs,
    pagination: {
      page,
      totalPages,
      total,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
});

export const logsRouter = router({
  getOrganizationLogs,
});
