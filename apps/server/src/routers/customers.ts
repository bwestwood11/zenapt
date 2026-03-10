import prisma from "../../prisma";
import { Prisma } from "../../prisma/generated/client";
import { protectedProcedure, router, withPermissions } from "../lib/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { canAccess, getUserAccessContext } from "../lib/subscription/permissions";

const getAllCustomers = withPermissions("READ::CUSTOMERS")
  .input(
    z.object({
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().max(100).default(10),
      search: z.string().optional(),
      locationId: z.string(),
    }),
  )
  .query(async ({ input }) => {
    const { page, limit, search, locationId } = input;
    const skip = (page - 1) * limit;

    const locationScope: Prisma.CustomerWhereInput = {
      OR: [
        { location: { some: { id: locationId } } },
        { appointments: { some: { locationId } } },
      ],
    };

    const where: Prisma.CustomerWhereInput = {
      ...locationScope,
      ...(search && {
        OR: [
          {
            user: {
              is: {
                name: { contains: search, mode: "insensitive" as const },
              },
            },
          },
          {
            user: {
              is: {
                email: { contains: search, mode: "insensitive" as const },
              },
            },
          },
          { phoneNumber: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          phoneNumber: true,
          dateOfBirth: true,
          status: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);



    return {
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

const getCustomerDetails = withPermissions("READ::CUSTOMERS")
  .input(
    z.object({
      customerId: z.string(),
      locationId: z.string(),
    }),
  )
  .query(async ({ input }) => {
    const { customerId, locationId } = input;

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        OR: [
          { location: { some: { id: locationId } } },
          { appointments: { some: { locationId } } },
        ],
      },
      select: {
        id: true,
        phoneNumber: true,
        dateOfBirth: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return customer;
  });

const getCustomerAnalytics = withPermissions("READ::CUSTOMERS")
  .input(
    z.object({
      customerId: z.string(),
      locationId: z.string(),
    }),
  )
  .query(async ({ input }) => {
    const { customerId, locationId } = input;

    const baseWhere = {
      customerId,
      locationId,
    };

    // Calculate date range for last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Run all queries concurrently
    const [
      customer,
      totalCount,
      completedCount,
      noShowCount,
      completedRevenue,
      monthlyAppointments,
    ] = await Promise.all([
      // Verify customer belongs to this location
      prisma.customer.findFirst({
        where: {
          id: customerId,
          OR: [
            { location: { some: { id: locationId } } },
            { appointments: { some: { locationId } } },
          ],
        },
        select: { id: true },
      }),

      // Total appointments count
      prisma.appointment.count({
        where: baseWhere,
      }),

      // Completed appointments count
      prisma.appointment.count({
        where: {
          ...baseWhere,
          status: "COMPLETED",
        },
      }),

      // No-show appointments count
      prisma.appointment.count({
        where: {
          ...baseWhere,
          status: "NO_SHOW",
        },
      }),

      // Total revenue from completed appointments
      prisma.appointment.aggregate({
        where: {
          ...baseWhere,
          status: "COMPLETED",
        },
        _sum: {
          price: true,
        },
      }),

      // Monthly data for last 12 months
      prisma.appointment.findMany({
        where: {
          ...baseWhere,
          startTime: {
            gte: twelveMonthsAgo,
          },
        },
        select: {
          startTime: true,
          status: true,
          price: true,
        },
        orderBy: {
          startTime: "asc",
        },
      }),
    ]);

    if (!customer) {
      return null;
    }

    // Calculate metrics
    const totalAppointments = totalCount;
    const completedAppointments = completedCount;
    const totalRevenue = completedRevenue._sum.price || 0;

    const showRate =
      completedAppointments + noShowCount > 0
        ? (completedAppointments / (completedAppointments + noShowCount)) * 100
        : 0;

    const aov =
      completedAppointments > 0 ? totalRevenue / completedAppointments : 0;

    const avgRevisitValue =
      completedAppointments > 1
        ? totalRevenue / Math.max(completedAppointments - 1, 1)
        : 0;

    // Group monthly appointments
    const monthlyData: Record<
      string,
      { count: number; revenue: number; completed: number }
    > = {};

    monthlyAppointments.forEach((apt) => {
      const date = new Date(apt.startTime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { count: 0, revenue: 0, completed: 0 };
      }

      monthlyData[monthKey].count++;
      if (apt.status === "COMPLETED") {
        monthlyData[monthKey].completed++;
        monthlyData[monthKey].revenue += apt.price;
      }
    });

    // Convert to array and sort by month
    const chartData = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        appointments: data.count,
        revenue: data.revenue,
        completed: data.completed,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalAppointments,
      completedAppointments,
      showRate: Math.round(showRate * 100) / 100,
      totalRevenue,
      aov: Math.round(aov * 100) / 100,
      avgRevisitValue: Math.round(avgRevisitValue * 100) / 100,
      chartData,
    };
  });

const getSpecialistCustomers = protectedProcedure
  .input(
    z.object({
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().max(100).default(10),
      search: z.string().optional(),
      locationId: z.string(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const { page, limit, search, locationId } = input;
    const skip = (page - 1) * limit;

    const organizationId = ctx.session.user.organizationId;
    if (!organizationId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User is not associated with an organization",
      });
    }

    const accessContext = await getUserAccessContext(ctx.session.user.id);
    const hasPermission = canAccess(
      accessContext,
      ["READ::APPOINTMENTS"],
      {
        organizationId,
        locationId,
      },
    );

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Insufficient permissions to view customers",
      });
    }

    const employeeAssignments = await prisma.locationEmployee.findMany({
      where: {
        locationId,
        userId: ctx.session.user.id,
      },
      select: { id: true },
    });

    if (employeeAssignments.length === 0) {
      return {
        customers: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const locationEmployeeIds = employeeAssignments.map((assignment) => assignment.id);

    const where: Prisma.CustomerWhereInput = {
      appointments: {
        some: {
          locationId,
          service: {
            some: {
              locationEmployeeId: {
                in: locationEmployeeIds,
              },
            },
          },
        },
      },
      ...(search && {
        OR: [
          {
            user: {
              is: {
                name: { contains: search, mode: "insensitive" as const },
              },
            },
          },
          {
            user: {
              is: {
                email: { contains: search, mode: "insensitive" as const },
              },
            },
          },
          { phoneNumber: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          phoneNumber: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    const customerIds = customers.map((customer) => customer.id);

    const appointmentStats =
      customerIds.length > 0
        ? await prisma.appointment.groupBy({
            by: ["customerId"],
            where: {
              locationId,
              customerId: {
                in: customerIds,
              },
              service: {
                some: {
                  locationEmployeeId: {
                    in: locationEmployeeIds,
                  },
                },
              },
            },
            _count: {
              _all: true,
            },
            _max: {
              startTime: true,
            },
          })
        : [];

    const statsMap = new Map(
      appointmentStats.map((item) => [
        item.customerId,
        {
          totalAppointments: item._count._all,
          lastAppointmentAt: item._max.startTime,
        },
      ]),
    );

    return {
      customers: customers.map((customer) => {
        const stats = statsMap.get(customer.id);

        return {
          ...customer,
          totalAppointments: stats?.totalAppointments ?? 0,
          lastAppointmentAt: stats?.lastAppointmentAt ?? null,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

const getSpecialistCustomerDetails = protectedProcedure
  .input(
    z.object({
      customerId: z.string(),
      locationId: z.string(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const { customerId, locationId } = input;

    const organizationId = ctx.session.user.organizationId;
    if (!organizationId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User is not associated with an organization",
      });
    }

    const accessContext = await getUserAccessContext(ctx.session.user.id);
    const hasPermission = canAccess(accessContext, ["READ::APPOINTMENTS"], {
      organizationId,
      locationId,
    });

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Insufficient permissions to view customer details",
      });
    }

    const employeeAssignments = await prisma.locationEmployee.findMany({
      where: {
        locationId,
        userId: ctx.session.user.id,
      },
      select: { id: true },
    });

    if (employeeAssignments.length === 0) {
      return null;
    }

    const locationEmployeeIds = employeeAssignments.map((assignment) => assignment.id);

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        appointments: {
          some: {
            locationId,
            service: {
              some: {
                locationEmployeeId: {
                  in: locationEmployeeIds,
                },
              },
            },
          },
        },
      },
      select: {
        id: true,
        phoneNumber: true,
        dateOfBirth: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return customer;
  });

const getSpecialistCustomerAnalytics = protectedProcedure
  .input(
    z.object({
      customerId: z.string(),
      locationId: z.string(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const { customerId, locationId } = input;

    const organizationId = ctx.session.user.organizationId;
    if (!organizationId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User is not associated with an organization",
      });
    }

    const accessContext = await getUserAccessContext(ctx.session.user.id);
    const hasPermission = canAccess(accessContext, ["READ::APPOINTMENTS"], {
      organizationId,
      locationId,
    });

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Insufficient permissions to view customer analytics",
      });
    }

    const employeeAssignments = await prisma.locationEmployee.findMany({
      where: {
        locationId,
        userId: ctx.session.user.id,
      },
      select: { id: true },
    });

    if (employeeAssignments.length === 0) {
      return null;
    }

    const locationEmployeeIds = employeeAssignments.map((assignment) => assignment.id);

    const scopedAppointmentWhere = {
      customerId,
      locationId,
      service: {
        some: {
          locationEmployeeId: {
            in: locationEmployeeIds,
          },
        },
      },
    };

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [customer, totalCount, completedCount, noShowCount, completedRevenue, monthlyAppointments] =
      await Promise.all([
        prisma.customer.findFirst({
          where: {
            id: customerId,
            appointments: {
              some: {
                locationId,
                service: {
                  some: {
                    locationEmployeeId: {
                      in: locationEmployeeIds,
                    },
                  },
                },
              },
            },
          },
          select: { id: true },
        }),

        prisma.appointment.count({
          where: scopedAppointmentWhere,
        }),

        prisma.appointment.count({
          where: {
            ...scopedAppointmentWhere,
            status: "COMPLETED",
          },
        }),

        prisma.appointment.count({
          where: {
            ...scopedAppointmentWhere,
            status: "NO_SHOW",
          },
        }),

        prisma.appointment.aggregate({
          where: {
            ...scopedAppointmentWhere,
            status: "COMPLETED",
          },
          _sum: {
            price: true,
          },
        }),

        prisma.appointment.findMany({
          where: {
            ...scopedAppointmentWhere,
            startTime: {
              gte: twelveMonthsAgo,
            },
          },
          select: {
            startTime: true,
            status: true,
            price: true,
          },
          orderBy: {
            startTime: "asc",
          },
        }),
      ]);

    if (!customer) {
      return null;
    }

    const totalAppointments = totalCount;
    const completedAppointments = completedCount;
    const totalRevenue = completedRevenue._sum.price || 0;

    const showRate =
      completedAppointments + noShowCount > 0
        ? (completedAppointments / (completedAppointments + noShowCount)) * 100
        : 0;

    const aov =
      completedAppointments > 0 ? totalRevenue / completedAppointments : 0;

    const avgRevisitValue =
      completedAppointments > 1
        ? totalRevenue / Math.max(completedAppointments - 1, 1)
        : 0;

    const monthlyData: Record<
      string,
      { count: number; revenue: number; completed: number }
    > = {};

    monthlyAppointments.forEach((apt) => {
      const date = new Date(apt.startTime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { count: 0, revenue: 0, completed: 0 };
      }

      monthlyData[monthKey].count++;
      if (apt.status === "COMPLETED") {
        monthlyData[monthKey].completed++;
        monthlyData[monthKey].revenue += apt.price;
      }
    });

    const chartData = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        appointments: data.count,
        revenue: data.revenue,
        completed: data.completed,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalAppointments,
      completedAppointments,
      showRate: Math.round(showRate * 100) / 100,
      totalRevenue,
      aov: Math.round(aov * 100) / 100,
      avgRevisitValue: Math.round(avgRevisitValue * 100) / 100,
      chartData,
    };
  });

export const customerRouter = router({
  getAllCustomers,
  getCustomerDetails,
  getCustomerAnalytics,
  getSpecialistCustomers,
  getSpecialistCustomerDetails,
  getSpecialistCustomerAnalytics,
});
