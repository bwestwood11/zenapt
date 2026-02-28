import prisma from "../../prisma";
import { Prisma } from "../../prisma/generated/client";
import { router, withPermissions } from "../lib/trpc";
import { z } from "zod";

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

export const customerRouter = router({
  getAllCustomers,
  getCustomerDetails,
  getCustomerAnalytics,
});
