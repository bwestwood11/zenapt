import z from "zod";
import prisma from "../../prisma";
import { publicProcedure, router } from "../lib/trpc";
import { TRPCError } from "@trpc/server";
import {
  calculateDiscountedTotal,
  resolveActivePromoCode,
} from "../lib/payments/promo";

// TODO Implement Rate Limit and throttle as well as caching

const getAllLocations = publicProcedure
  .input(z.object({ orgId: z.string().min(2).max(60) }))
  .query(async ({ ctx, input }) => {
    try {
      const locations = await prisma.location.findMany({
        where: {
          organizationId: input.orgId,
        },
        select: {
          id: true,
          address: true,
          name: true,
          slug: true,
          timeZone: true,
          image: true,
          city: true,
          country: true,
          state: true,
        },
      });

      return locations;
    } catch (error) {
      console.error(error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Something went wrong. Try contacting support or retry after some time",
      });
    }
  });

const getOrganization = publicProcedure
  .input(z.object({ orgId: z.string().min(2).max(60) }))
  .query(async ({ input }) => {
    try {
      const organization = await prisma.organization.findUnique({
        where: {
          id: input.orgId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          logo: true,
          slug: true,
        },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      return organization;
    } catch (error) {
      console.error(error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Something went wrong. Try contacting support or retry after some time",
      });
    }
  });

const getServicesByLocation = publicProcedure
  .input(z.object({ locationId: z.string().min(2).max(60) }))
  .query(async ({ ctx, input }) => {
    try {
      const services = await prisma.serviceTerms.findMany({
        where: {
          // locationId: input.locationId,
          Service: {
            some: {
              locationId: input.locationId,
              isActive: true,
            },
          },
        },
        select: {
          excerpt: true,
          id: true,
          serviceGroup: {
            select: {
              name: true,
              id: true,
            },
          },
          name: true,
        },
      });

      type Service = (typeof services)[number];

      const groupMap = new Map<
        string,
        {
          id: string;
          name: string;
          services: Omit<Service, "serviceGroup">[];
        }
      >();

      for (const s of services) {
        const groupId = s.serviceGroup?.id;

        const newService: Omit<Service, "serviceGroup"> = {
          excerpt: s.excerpt,
          id: s.id,
          name: s.name,
        };

        // Handle NON_GROUP case
        if (!groupId) {
          const key = "NON_GROUP";

          if (!groupMap.has(key)) {
            groupMap.set(key, {
              id: key,
              name: "NON_GROUP",
              services: [],
            });
          }

          groupMap.get(key)!.services.push(newService);
          continue;
        }

        // Normal grouped case
        if (!groupMap.has(groupId)) {
          groupMap.set(groupId, {
            id: groupId,
            name: s.serviceGroup?.name || "NO_NAME",
            services: [],
          });
        }

        groupMap.get(groupId)!.services.push(newService);
      }

      const grouped = Array.from(groupMap.values());
      console.log(grouped);

      return grouped;
    } catch (error) {}
  });

// Pick up here on Monday
const getServiceDetails = publicProcedure
  .input(z.object({ serviceId: z.string().min(2).max(60) }))
  .query(async ({ ctx, input }) => {
    try {
      const output = await prisma.serviceTerms.findUnique({
        where: {
          id: input.serviceId,
        },
        select: {
          description: true,
          excerpt: true,
          id: true,
          name: true,
          Service: {
            select: {
              price: true,
              duration: true,
              id: true,
              locationEmployeeId: true,
              addOns: { select: { id: true } },
              locationEmployee: {
                select: {
                  user: { select: { name: true, image: true, id: true } },
                },
              },
            },
          },
          addOns: {
            select: {
              id: true,
              name: true,
              description: true,
              basePrice: true,
              incrementalDuration: true,
            },
          },
        },
      });

      if (!output) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service not found",
        });
      }

      const serviceDetails = {
        ...output,
        employees: output.Service.map((service) => ({
          price: service.price,
          duration: service.duration,
          id: service.id,
          locationEmployeeId: service.locationEmployeeId,
          userName: service.locationEmployee?.user.name || null,
          userImage: service.locationEmployee?.user.image || null,
          userId: service.locationEmployee?.user.id || null,
          addons: service.addOns,
        })),
      };

      return serviceDetails;
    } catch (error) {}
  });

const getLocationBookingPolicy = publicProcedure
  .input(z.object({ locationId: z.string().min(2).max(60) }))
  .query(async ({ input }) => {
    const settings = await prisma.appointmentSettings.findUnique({
      where: { locationId: input.locationId },
      select: {
        downpaymentPercentage: true,
        cancellationPercent: true,
        noShowPercent: true,
        cancellationDuration: true,
      },
    });

    return {
      downpaymentPercentage: settings?.downpaymentPercentage ?? 0,
      cancellationPercent: settings?.cancellationPercent ?? 100,
      noShowPercent: settings?.noShowPercent ?? 100,
      cancellationDuration: settings?.cancellationDuration ?? 60,
    };
  });

const validatePromoCode = publicProcedure
  .input(
    z.object({
      locationId: z.string().min(2).max(60),
      code: z.string().trim().min(1).max(64),
      totalAmount: z.number().int().min(0),
    }),
  )
  .mutation(async ({ input }) => {
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

    const promoCode = await resolveActivePromoCode({
      code: input.code,
      organizationId: location.organizationId,
      locationId: input.locationId,
    });

    const { discountAmount, discountedTotal } = calculateDiscountedTotal(
      input.totalAmount,
      promoCode.discountPercentage,
    );

    return {
      code: promoCode.code,
      discountPercentage: promoCode.discountPercentage,
      discountAmount,
      discountedTotal,
    };
  });

export const publicRouter = router({
  getAllLocations,
  getOrganization,
  getServicesByLocation,
  getServiceDetails,
  getLocationBookingPolicy,
  validatePromoCode,
});
