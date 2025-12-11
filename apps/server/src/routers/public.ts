import z from "zod";
import prisma from "../../prisma";
import { publicProcedure, router } from "../lib/trpc";
import { TRPCError } from "@trpc/server";

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
              addOns: {select: {id: true}},
              locationEmployee: {
                select: {
                  user: { select: { name: true, image: true, id: true, } },
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
          userName: service.locationEmployee?.user.name || null,
          userImage: service.locationEmployee?.user.image || null,
          userId: service.locationEmployee?.user.id || null,
          addons: service.addOns
        })),
      };

      return serviceDetails;
    } catch (error) {}
  });

export const publicRouter = router({
  getAllLocations,
  getServicesByLocation,
  getServiceDetails,
});
