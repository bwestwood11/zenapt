import z from "zod";
import {
  getAppointmentsInRange,
  getLocationSpecialistsSchedule,
} from "../lib/appointment/employees";
import {
  publicProcedure,
  router,
  withPermissions,
} from "../lib/trpc";
import prisma from "../../prisma";
import { TRPCError } from "@trpc/server";
import {
  getAvailableTimings,
  isEditConflictFastFail,
} from "../lib/appointment/appointment";
import { sendAppointmentBookedEmail } from "../lib/email/appointment";
import { after } from "next/server";
import { stripe } from "../lib/stripe/server-stripe";
import Stripe from "stripe";
import {
  calculateDiscountedTotal,
  resolveActivePromoCode,
} from "../lib/payments/promo";

const CHARGEABLE_PAYMENT_TYPES = ["DOWNPAYMENT", "BALANCE", "CANCELLATION"] as const;

async function getAppointmentCollectedAmount(appointmentId: string) {
  const payments = await prisma.customerAppointmentPayment.aggregate({
    where: {
      appointmentId,
      paymentType: {
        in: [...CHARGEABLE_PAYMENT_TYPES],
      },
      status: {
        in: ["PENDING", "SUCCEEDED"],
      },
    },
    _sum: {
      amountPaid: true,
    },
  });

  return payments._sum.amountPaid ?? 0;
}

export const appointmentRouter = router({
  fetchSpecialistUpcomingAppointments: withPermissions(["READ::APPOINTMENTS"], z.object({
    locationId: z.string(),
    startDate: z.date(),
    endDate: z.date(),
  }))
    .query(async ({ ctx, input }) => {
      const specialist = await prisma.locationEmployee.findFirst({
        where: {
          locationId: input.locationId,
          userId: ctx.session.user.id,
          role: "LOCATION_SPECIALIST",
        },
        select: { id: true },
      });


      console.log("Specialist ID:", specialist?.id);

      if (!specialist) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only specialists can access specialist appointment data",
        });
      }

      const appointments = await prisma.appointment.findMany({
        where: {
          locationId: input.locationId,
          startTime: { gte: input.startDate },
          endTime: { lte: input.endDate },
          service: {
            some: { locationEmployeeId: specialist.id },
          },
        },
        orderBy: { startTime: "asc" },
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
          service: {
            where: {
              locationEmployeeId: specialist.id,
            },
            select: {
              serviceTerms: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      return appointments.map((appointment) => ({
        id: appointment.id,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        customerName: appointment.customer.user.name,
        serviceNames: appointment.service.map((item) => item.serviceTerms.name),
      }));
    }),

  fetchSpecialistDailySchedule: withPermissions(["READ::LOCATION", "READ::MASTER_CALENDAR"], z.object({
    locationId: z.string(),
    date: z.date(),
  }))
    .query(async ({ ctx, input }) => {
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
          message: "Only specialists can access specialist schedule data",
        });
      }

      const schedule = await getLocationSpecialistsSchedule(
        input.locationId,
        input.date,
      );

      if (schedule.code !== "SUCCESS") {
        return {
          code: schedule.code,
          timeZone: schedule.timeZone,
          workHours: null,
          breaks: [],
        };
      }

      const specialistSchedule = schedule.schedule.find(
        (item) =>
          "employee" in item &&
          (("userId" in item.employee &&
            item.employee.userId === ctx.session.user.id) ||
            item.employee.id === specialist.id),
      );

      if (specialistSchedule?.code !== "WORKING") {
        return {
          code: "EMPLOYEE_OFF" as const,
          timeZone: schedule.timeZone,
          workHours: null,
          breaks: [],
        };
      }

      return {
        code: "WORKING" as const,
        timeZone: schedule.timeZone,
        workHours: specialistSchedule.workHours,
        breaks: specialistSchedule.breaks,
      };
    }),

  fetchEmployeesSchedule: withPermissions([
    "READ::MASTER_CALENDAR",
    "READ::EMPLOYEES",
  ])
    .input(z.object({ locationId: z.string(), date: z.date() }))
    .query(({ input }) => {
      return getLocationSpecialistsSchedule(input.locationId, input.date);
    }),
  fetchAppointments: withPermissions(["READ::APPOINTMENTS"])
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        locationId: z.string(),
      }),
    )
    .query(({ input }) => {
      return getAppointmentsInRange({
        startDate: input.startDate,
        endDate: input.endDate,
        locationId: input.locationId,
      });
    }),
  updateAppointmentTiming: withPermissions(["UPDATE::APPOINTMENTS"])
    .input(
      z.object({
        locationId: z.string(),
        locationEmployeeId: z.string(),
        appointmentId: z.string(),
        newStartTime: z.date(),
        newEndTime: z.date(),
      }),
    )
    .mutation(async ({ input }) => {
      const {
        appointmentId,
        locationEmployeeId,
        locationId,
        newStartTime,
        newEndTime,
      } = input;

      // Validate that times are in 5-minute intervals
      if (
        newStartTime.getMinutes() % 5 !== 0 ||
        newEndTime.getMinutes() % 5 !== 0
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Appointment times must be in 15-minute intervals",
        });
      }

      if (newStartTime.getTime() > newEndTime.getTime()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Start time cannot be greater than End time",
        });
      }

      // Fetch the appointment
      const appointment = await prisma.appointment.findUnique({
        where: { id: input.appointmentId },
        include: {
          service: {
            select: { id: true, serviceTerms: { select: { id: true } } },
          },
          addOns: {
            select: { id: true },
          },
        },
      });

      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found",
        });
      }

      const newServices = await prisma.employeeService.findMany({
        where: {
          serviceTerms: {
            id: { in: appointment.service.map((a) => a.serviceTerms.id) },
          },
          locationEmployeeId: locationEmployeeId,
        },
        select: {
          id: true,
          bufferTime: true,
          prepTime: true,
          addOns: {
            select: { id: true },
          },
        },
      });

      if (newServices.length != appointment.service.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "The Employee cannot perform all the services as of old appointment",
        });
      }

      // Calculate max buffer and prep times from all services
      const maxBufferTime = Math.max(
        ...newServices.map((s) => s.bufferTime),
        0,
      );
      const maxPrepTime = Math.max(...newServices.map((s) => s.prepTime), 0);

      const hasConflict = await isEditConflictFastFail({
        appointmentId,
        employeeId: locationEmployeeId,
        startTime: newStartTime,
        locationId,
        endTime: newEndTime,
        bufferTime: maxBufferTime,
        prepTime: maxPrepTime,
      });

      // Validate that the new employee can perform all add-ons from the appointment
      if (appointment.addOns.length > 0) {
        const newEmployeeAddOnIds = new Set(
          newServices.flatMap((service) =>
            service.addOns.map((addOn) => addOn.id),
          ),
        );

        const missingAddOns = appointment.addOns.filter(
          (addOn) => !newEmployeeAddOnIds.has(addOn.id),
        );

        if (missingAddOns.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "The Employee cannot perform all the add-ons from the original appointment",
          });
        }
      }

      if (hasConflict) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "The time is not available for booking either there is a appointment, break or timeoff",
        });
      }

      await prisma.appointment.update({
        where: {
          id: appointmentId,
        },
        data: {
          startTime: newStartTime,
          endTime: newEndTime,
          bufferTime: maxBufferTime,
          prepTime: maxPrepTime,
          service: {
            disconnect: appointment.service.map((s) => ({ id: s.id })),
            connect: newServices.map((s) => ({ id: s.id })),
          },
        },
      });
      return {
        success: true,
        employeeId: locationEmployeeId,
        startTime: newStartTime,
        endTime: newEndTime,
        appointmentId: appointmentId,
      };
      //  Check if the employee ids have changed.
      // if changed, then get the employee services for the new employee to see if they can perform the service
      //  in the changed employee - must calculate the new duration based on the service duration for the new employee
      //   If missing serviceId, then throw error (employee cannot perform service)
      //  Check all conflicts after calculating new duration and timings.
      // Update the appointment
      // Send User an mail saying the appointment is rescheduled
    }),

  hasConflictForTimings: withPermissions(["READ::APPOINTMENTS"])
    .input(
      z.object({
        locationId: z.string(),
        locationEmployeeId: z.string(),
        proposedStartTime: z.date(),
        proposedEndTime: z.date(),
        bufferTime: z.number().optional(),
        prepTime: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      const {
        locationEmployeeId,
        proposedStartTime,
        locationId,
        proposedEndTime,
        bufferTime,
        prepTime,
      } = input;
      const hasConflict = await isEditConflictFastFail({
        employeeId: locationEmployeeId,
        startTime: proposedStartTime,
        locationId,
        endTime: proposedEndTime,
        bufferTime: bufferTime,
        prepTime: prepTime,
      });
      return { hasConflict };
    }),
  getNewTimingEstimate: withPermissions(["READ::APPOINTMENTS"])
    .input(
      z.object({
        locationId: z.string(),
        locationEmployeeId: z.string(),
        appointmentId: z.string(),
        proposedStartTime: z.date(),
        changeDuration: z.boolean(),
        proposedEndTime: z.date(),
      }),
    )
    .query(async ({ input }) => {
      const {
        appointmentId,
        locationEmployeeId,
        proposedStartTime,
        locationId,
        changeDuration,
        proposedEndTime,
      } = input;

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          service: {
            select: { id: true, serviceTerms: { select: { id: true } } },
          },
        },
      });

      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found",
        });
      }

      let estimatedEndTime = proposedEndTime;

      let maxBufferTime = appointment.bufferTime;
      let maxPrepTime = appointment.prepTime;

      if (changeDuration) {
        const newServices = await prisma.employeeService.findMany({
          where: {
            serviceTerms: {
              id: { in: appointment.service.map((a) => a.serviceTerms.id) },
            },
            locationEmployeeId: locationEmployeeId,
          },
          select: {
            id: true,
            duration: true,
            bufferTime: true,
            prepTime: true,
          },
        });

        if (newServices.length != appointment.service.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "The Employee cannot perform all the services as of old appointment",
          });
        }

        const newDuration = newServices.reduce(
          (acc, curr) => acc + curr.duration,
          0,
        );

        // Calculate max buffer and prep times
        maxBufferTime = Math.max(...newServices.map((s) => s.bufferTime), 0);
        maxPrepTime = Math.max(...newServices.map((s) => s.prepTime), 0);

        estimatedEndTime = new Date(
          proposedStartTime.getTime() + newDuration * 60000,
        );
      }

      const hasConflict = await isEditConflictFastFail({
        appointmentId,
        employeeId: locationEmployeeId,
        startTime: proposedStartTime,
        locationId,
        endTime: estimatedEndTime,
        bufferTime: maxBufferTime,
        prepTime: maxPrepTime,
      });

      return {
        proposedStartTime,
        proposedEndTime: estimatedEndTime,
        hasConflict,
        prepTime: maxPrepTime,
        bufferTime: maxBufferTime,
      };
    }),
  getCustomersForAppointment: withPermissions(["READ::CUSTOMERS"])
    .input(
      z.object({
        locationId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().nullable(),
      }),
    )
    .query(async ({ input }) => {
      const { locationId, cursor, limit, search } = input;
      console.log("Fetching customers for appointment:", input);
      const where = {
        location: { some: { id: locationId } },
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
          ],
        }),
      };

      const customers = await prisma.customer.findMany({
        where,
        // 20 + 1 to check if there is a next page
        take: limit + 1,
        ...(cursor && {
          cursor: { id: cursor },
          skip: 1,
        }),
        orderBy: { user: { name: "asc" } },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      const hasNextPage = customers.length > limit;
      const items = hasNextPage ? customers.slice(0, limit) : customers;

      return {
        customers: items,
        nextCursor: hasNextPage ? items.at(-1)?.id : undefined,
      };
    }),

  getAvailableTimings: publicProcedure
    .input(
      z.object({
        locationId: z.string(),
        employeeId: z.string(),
        date: z.date(),
        duration: z.number(),
      }),
    )
    .query(({ input }) => {
      return getAvailableTimings(input);
    }),

  getFirstAvailableProfessional: publicProcedure
    .input(
      z.object({
        locationId: z.string(),
        candidates: z
          .array(
            z.object({
              employeeId: z.string(),
              duration: z.number().min(1),
            }),
          )
          .min(1),
        startDate: z.date().optional(),
      }),
    )
    .query(async ({ input }) => {
      const startDate = new Date(input.startDate ?? new Date());
      startDate.setHours(0, 0, 0, 0);

      const maxDaysToCheck = 30;

      for (let offset = 0; offset < maxDaysToCheck; offset++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + offset);

        const availabilityPerEmployee = await Promise.all(
          input.candidates.map(async (candidate) => {
            const timings = await getAvailableTimings({
              locationId: input.locationId,
              employeeId: candidate.employeeId,
              date,
              duration: candidate.duration,
            });

            const firstTiming = timings[0];
            if (!firstTiming) {
              return null;
            }

            return {
              employeeId: candidate.employeeId,
              start: firstTiming.start,
              end: firstTiming.end,
            };
          }),
        );

        const sortedByEarliest = availabilityPerEmployee
          .filter((entry): entry is NonNullable<typeof entry> => !!entry)
          .sort((a, b) => a.start.getTime() - b.start.getTime());

        const earliest = sortedByEarliest[0];
        if (earliest) {
          return earliest;
        }
      }

      return null;
    }),

  getAppointmentChargeSummary: withPermissions(["READ::APPOINTMENTS"])
    .input(
      z.object({
        appointmentId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const appointment = await prisma.appointment.findUnique({
        where: { id: input.appointmentId },
        select: {
          id: true,
          price: true,
          promoCodeId: true,
          discountPercentageApplied: true,
          discountAmountApplied: true,
          paymentMethodId: true,
          paymentMethodLast4: true,
          promoCode: {
            select: {
              code: true,
              discount: true,
            },
          },
          service: {
            where: {
              locationEmployeeId: {
                not: null,
              },
            },
            select: {
              locationEmployee: {
                select: {
                  id: true,
                  user: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
          customer: {
            select: {
              stripeCustomerId: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          location: {
            select: {
              id:true,
              organizationId: true,
              appointmentSettings: {
                select: {
                  tipEnabled: true,
                  tipPresetPercentages: true,
                },
              },
            },
          },
        },
      });

      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found",
        });
      }

      const organization = await prisma.organization.findUnique({
        where: { id: appointment.location.organizationId },
        select: {
          stripeAccountId: true,
        },
      });

      const savedPaymentMethods =
        appointment.customer.stripeCustomerId && organization?.stripeAccountId
          ? await stripe.paymentMethods
              .list(
                {
                  customer: appointment.customer.stripeCustomerId,
                  type: "card",
                },
                {
                  stripeAccount: organization.stripeAccountId,
                },
              )
              .then((result) =>
                result.data
                  .filter((paymentMethod) => Boolean(paymentMethod.card))
                  .map((paymentMethod) => ({
                    id: paymentMethod.id,
                    brand: paymentMethod.card?.brand ?? "card",
                    last4: paymentMethod.card?.last4 ?? "****",
                    expMonth: paymentMethod.card?.exp_month ?? 0,
                    expYear: paymentMethod.card?.exp_year ?? 0,
                  })),
              )
          : [];

      const [alreadyChargedAmount, tipCollected] = await Promise.all([
        getAppointmentCollectedAmount(appointment.id),
        prisma.appointmentTipCharge.aggregate({
          where: {
            appointmentId: appointment.id,
            status: {
              in: ["PENDING", "SUCCEEDED"],
            },
          },
          _sum: {
            amount: true,
          },
        }),
      ]);

      const uniqueTipEmployees = Array.from(
        new Map(
          appointment.service
            .map((service) => service.locationEmployee)
            .filter(
              (
                employee,
              ): employee is NonNullable<(typeof appointment.service)[number]["locationEmployee"]> =>
                Boolean(employee),
            )
            .map((employee) => [employee.id, employee]),
        ).values(),
      );

      const fallbackDiscountAmount = calculateDiscountedTotal(
        appointment.price,
        appointment.promoCode?.discount ?? 0,
      ).discountAmount;
      const discountAmount = Math.max(
        0,
        appointment.discountAmountApplied ?? fallbackDiscountAmount,
      );
      const discountedTotal = Math.max(0, appointment.price - discountAmount);

      return {
        appointmentId: appointment.id,
        locationId: appointment.location.id,
        customerName: appointment.customer.user.name,
        totalAmount: appointment.price,
        discountAmount,
        discountedTotalAmount: discountedTotal,
        alreadyChargedAmount,
        remainingAmount: Math.max(0, discountedTotal - alreadyChargedAmount),
        tipCollectedAmount: tipCollected._sum.amount ?? 0,
        promoCode: appointment.promoCode?.code ?? null,
        promoDiscountPercentage:
          (appointment.discountPercentageApplied ?? 0) > 0
            ? appointment.discountPercentageApplied
            : null,
        selectedPaymentMethodId: appointment.paymentMethodId,
        savedPaymentMethods,
        hasPaymentMethod: Boolean(appointment.paymentMethodId),
        paymentMethodLast4: appointment.paymentMethodLast4,
        tipEnabled: appointment.location.appointmentSettings?.tipEnabled ?? false,
        tipPresetPercentages:
          appointment.location.appointmentSettings?.tipPresetPercentages ?? [],
        tipEmployeeName:
          uniqueTipEmployees.length === 1
            ? uniqueTipEmployees[0].user.name
            : null,
        hasMultipleTipEmployees: uniqueTipEmployees.length > 1,
      };
    }),

  createAppointmentCardSetupIntent: withPermissions(["UPDATE::APPOINTMENTS"])
    .input(
      z.object({
        appointmentId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const appointment = await prisma.appointment.findUnique({
        where: { id: input.appointmentId },
        select: {
          id: true,
          customerId: true,
          customer: {
            select: {
              stripeCustomerId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          location: {
            select: {
              id: true,
              organizationId: true,
            },
          },
        },
      });

      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found",
        });
      }

      const organization = await prisma.organization.findUnique({
        where: { id: appointment.location.organizationId },
        select: {
          stripeAccountId: true,
        },
      });

      if (!organization?.stripeAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization payments are not configured",
        });
      }

      let stripeCustomerId = appointment.customer.stripeCustomerId;

      if (!stripeCustomerId) {
        const stripeCustomer = await stripe.customers.create(
          {
            email: appointment.customer.user.email ?? undefined,
            name: appointment.customer.user.name ?? undefined,
            metadata: {
              userId: appointment.customer.user.id,
              customerId: appointment.customerId,
            },
          },
          {
            stripeAccount: organization.stripeAccountId,
          },
        );

        stripeCustomerId = stripeCustomer.id;

        await prisma.customer.update({
          where: { id: appointment.customerId },
          data: {
            stripeCustomerId,
          },
        });
      }

      const setupIntent = await stripe.setupIntents.create(
        {
          customer: stripeCustomerId,
          payment_method_types: ["card"],
          usage: "off_session",
          metadata: {
            paymentScope: "APPOINTMENT_BALANCE_AND_TIP",
            appointmentId: appointment.id,
            customerId: appointment.customerId,
            locationId: appointment.location.id,
            organizationId: appointment.location.organizationId,
          },
        },
        {
          stripeAccount: organization.stripeAccountId,
        },
      );

      const customerSession = await stripe.customerSessions.create(
        {
          customer: stripeCustomerId,
          components: {
            payment_element: {
              enabled: true,
            },
          },
        },
        {
          stripeAccount: organization.stripeAccountId,
        },
      );

      if (!setupIntent.client_secret) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to create setup intent",
        });
      }

      return {
        clientSecret: setupIntent.client_secret,
        customerSessionClientSecret: customerSession.client_secret,
        stripeAccountId: organization.stripeAccountId,
      };
    }),

  finalizeAppointmentCardSetupIntent: withPermissions(["UPDATE::APPOINTMENTS"])
    .input(
      z.object({
        appointmentId: z.string(),
        setupIntentId: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const appointment = await prisma.appointment.findUnique({
        where: { id: input.appointmentId },
        select: {
          id: true,
          customerId: true,
          customer: {
            select: {
              stripeCustomerId: true,
            },
          },
          location: {
            select: {
              id: true,
              organizationId: true,
            },
          },
        },
      });

      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found",
        });
      }

      const organization = await prisma.organization.findUnique({
        where: { id: appointment.location.organizationId },
        select: {
          stripeAccountId: true,
        },
      });

      if (!organization?.stripeAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization payments are not configured",
        });
      }

      const stripeCustomerId = appointment.customer.stripeCustomerId;
      if (!stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Customer payment profile is not configured",
        });
      }

      const setupIntent = await stripe.setupIntents.retrieve(
        input.setupIntentId,
        {
          expand: ["payment_method"],
        },
        {
          stripeAccount: organization.stripeAccountId,
        },
      );

      const setupIntentCustomerId =
        typeof setupIntent.customer === "string" ? setupIntent.customer : null;

      if (setupIntentCustomerId !== stripeCustomerId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Setup intent does not belong to this customer",
        });
      }

      const newPaymentMethod =
        setupIntent.payment_method &&
        typeof setupIntent.payment_method !== "string"
          ? setupIntent.payment_method
          : null;

      if (newPaymentMethod?.type !== "card") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No valid card payment method found",
        });
      }

      const fingerprint = newPaymentMethod.card?.fingerprint;

      let resolvedPaymentMethod = newPaymentMethod;

      if (fingerprint) {
        const existingPaymentMethods = await stripe.paymentMethods.list(
          {
            customer: stripeCustomerId,
            type: "card",
            limit: 20,
          },
          {
            stripeAccount: organization.stripeAccountId,
          },
        );

        const duplicate = existingPaymentMethods.data.find(
          (method) =>
            method.id !== newPaymentMethod.id &&
            method.card?.fingerprint === fingerprint,
        );

        if (duplicate) {
          await stripe.paymentMethods.detach(newPaymentMethod.id, {
            stripeAccount: organization.stripeAccountId,
          });

          resolvedPaymentMethod = duplicate;
        }
      }

      await stripe.customers.update(
        stripeCustomerId,
        {
          invoice_settings: {
            default_payment_method: resolvedPaymentMethod.id,
          },
        },
        {
          stripeAccount: organization.stripeAccountId,
        },
      );

      if (resolvedPaymentMethod.allow_redisplay !== "always") {
        await stripe.paymentMethods.update(
          resolvedPaymentMethod.id,
          {
            allow_redisplay: "always",
          },
          {
            stripeAccount: organization.stripeAccountId,
          },
        );
      }

      await prisma.appointment.update({
        where: {
          id: appointment.id,
        },
        data: {
          paymentMethodId: resolvedPaymentMethod.id,
          paymentMethodLast4: resolvedPaymentMethod.card?.last4 ?? null,
        },
      });

      return {
        card: {
          id: resolvedPaymentMethod.id,
          brand: resolvedPaymentMethod.card?.brand ?? null,
          last4: resolvedPaymentMethod.card?.last4 ?? null,
          expMonth: resolvedPaymentMethod.card?.exp_month ?? null,
          expYear: resolvedPaymentMethod.card?.exp_year ?? null,
        },
      };
    }),

  chargeAppointmentRemainingBalance: withPermissions(["UPDATE::APPOINTMENTS"])
    .input(
      z.object({
        appointmentId: z.string(),
        tipAmount: z.number().int().min(0).max(500000),
        paymentMethodId: z.string().optional(),
        promoCode: z.string().trim().min(1).max(64).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const appointment = await prisma.appointment.findUnique({
        where: { id: input.appointmentId },
        select: {
          id: true,
          status: true,
          price: true,
          customerId: true,
          paymentMethodId: true,
          promoCodeId: true,
          discountPercentageApplied: true,
          discountAmountApplied: true,
          promoCode: {
            select: {
              discount: true,
              code: true,
            },
          },
          service: {
            select: {
              locationEmployeeId: true,
            },
          },
          customer: {
            select: {
              stripeCustomerId: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          location: {
            select: {
              id: true,
              organizationId: true,
            },
          },
        },
      });

      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found",
        });
      }

      if (appointment.status === "CANCELED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot charge a canceled appointment",
        });
      }

      if (!appointment.customer.stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Customer payment profile is not configured",
        });
      }

      const resolvedPaymentMethodId =
        input.paymentMethodId ?? appointment.paymentMethodId;

      if (!resolvedPaymentMethodId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No saved payment method is available for this appointment",
        });
      }

      const organization = await prisma.organization.findUnique({
        where: { id: appointment.location.organizationId },
        select: {
          stripeAccountId: true,
        },
      });

      if (!organization?.stripeAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization payments are not configured",
        });
      }

      const selectedPaymentMethod = await stripe.paymentMethods.retrieve(
        resolvedPaymentMethodId,
        {
          stripeAccount: organization.stripeAccountId,
        },
      );

      const paymentMethodCustomerId =
        typeof selectedPaymentMethod.customer === "string"
          ? selectedPaymentMethod.customer
          : null;

      if (paymentMethodCustomerId !== appointment.customer.stripeCustomerId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Selected card does not belong to this customer",
        });
      }

      let resolvedPromoCode:
        | {
            id: string;
            code: string;
            discountPercentage: number;
          }
        | null = null;

      if (input.promoCode) {
        resolvedPromoCode = await resolveActivePromoCode({
          code: input.promoCode,
          organizationId: appointment.location.organizationId,
          locationId: appointment.location.id,
        });
      } else if (appointment.promoCode && appointment.promoCodeId) {
        resolvedPromoCode = {
          id: appointment.promoCodeId,
          code: appointment.promoCode.code,
          discountPercentage: appointment.promoCode.discount,
        };
      }

      const appliedDiscountPercentage =
        resolvedPromoCode?.discountPercentage ??
        appointment.discountPercentageApplied ??
        appointment.promoCode?.discount ??
        0;

      const { discountAmount, discountedTotal } = calculateDiscountedTotal(
        appointment.price,
        appliedDiscountPercentage,
      );
      const hasAppliedDiscount = discountAmount > 0;

      const alreadyChargedAmount = await getAppointmentCollectedAmount(appointment.id);
      const tipEmployeeIds = Array.from(
        new Set(
          appointment.service
            .map((service) => service.locationEmployeeId)
            .filter((value): value is string => Boolean(value)),
        ),
      );
      const tipEmployeeId = tipEmployeeIds[0] ?? null;
      const remainingAmount = Math.max(0, discountedTotal - alreadyChargedAmount);
      const tipAmount = input.tipAmount;
      const chargeAmount = remainingAmount + tipAmount;

      if (chargeAmount <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No chargeable amount remains for this appointment",
        });
      }

      if (tipAmount > 0 && tipEmployeeIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No assigned employee found for this appointment tip",
        });
      }

      if (tipAmount > 0 && tipEmployeeIds.length > 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This appointment has multiple employees. Please split services before charging tip.",
        });
      }

      try {
        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: chargeAmount,
            currency: "usd",
            customer: appointment.customer.stripeCustomerId,
            payment_method: resolvedPaymentMethodId,
            confirm: true,
            off_session: true,
            
            description: `Appointment remaining balance charge for ${appointment.id}`,
            metadata: {
              paymentScope: "APPOINTMENT_BALANCE_AND_TIP",
              appointmentId: appointment.id,
              customerId: appointment.customerId,
              locationId: appointment.location.id,
              organizationId: appointment.location.organizationId,
              remainingAmount: String(remainingAmount),
              tipAmount: String(tipAmount),
              discountAmount: String(discountAmount),
              discountedTotal: String(discountedTotal),
              promoCode: resolvedPromoCode?.code ?? "",
            },
          },
          {
            stripeAccount: organization.stripeAccountId,
          },
        );

        await prisma.$transaction(async (tx) => {
          await tx.appointment.update({
            where: {
              id: appointment.id,
            },
            data: {
              paymentMethodId: resolvedPaymentMethodId,
              paymentMethodLast4: selectedPaymentMethod.card?.last4 ?? null,
              promoCodeId: resolvedPromoCode?.id ?? appointment.promoCodeId,
              discountPercentageApplied: hasAppliedDiscount
                ? appliedDiscountPercentage
                : null,
              discountAmountApplied: hasAppliedDiscount ? discountAmount : null,
            },
          });

          if (remainingAmount > 0) {
            await tx.customerAppointmentPayment.create({
              data: {
                customerId: appointment.customerId,
                appointmentId: appointment.id,
                amountPaid: remainingAmount,
                paymentType: "BALANCE",
                status: "PENDING",
                paymentMethod: resolvedPaymentMethodId,
                transactionId: paymentIntent.id,
              },
            });
          }

          if (tipAmount > 0) {
            await tx.appointmentTipCharge.create({
              data: {
                customerId: appointment.customerId,
                appointmentId: appointment.id,
                locationEmployeeId: tipEmployeeId,
                amount: tipAmount,
                status: "PENDING",
                paymentMethod: resolvedPaymentMethodId,
                transactionId: paymentIntent.id,
              },
            });
          }
        });

        return {
          success: true,
          appointmentId: appointment.id,
          chargedAmount: chargeAmount,
          remainingAmount,
          tipAmount,
          discountAmount,
          discountedTotal,
          discountPercentageApplied: appliedDiscountPercentage,
          promoCode: resolvedPromoCode?.code ?? null,
          customerName: appointment.customer.user.name,
        };
      } catch (error) {
        if (error instanceof Stripe.errors.StripeError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error.message ||
              "Failed to charge the saved card. Please ask customer to update payment method.",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process charge",
        });
      }
    }),

  createAppointment: withPermissions(["CREATE::APPOINTMENTS"])
    .input(
      z.object({
        locationId: z.string(),
        locationEmployeeId: z.string(),
        customerId: z.string(),
        serviceIds: z.array(z.string()).min(1),
        addOnIds: z.array(z.string()).optional(),
        startTime: z.date(),
        endTime: z.date(),
      }),
    )
    .mutation(async ({ input }) => {
      const {
        locationId,
        locationEmployeeId,
        customerId,
        serviceIds,
        startTime,
        endTime,
        addOnIds,
      } = input;

      // Validate that times are in 5-minute intervals
      if (startTime.getMinutes() % 5 !== 0 || endTime.getMinutes() % 5 !== 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Appointment times must be in 15-minute intervals",
        });
      }

      // Validate start time is before end time
      if (startTime.getTime() >= endTime.getTime()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Start time must be before end time",
        });
      }

      // Validate customer exists and belongs to location
      const customer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          location: { some: { id: locationId } },
        },
      });

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found or does not belong to this location",
        });
      }

      // Validate employee services exist and match the requested services
      const employeeServices = await prisma.employeeService.findMany({
        where: {
          id: { in: serviceIds },
          locationEmployeeId,
        },
        include: {
          serviceTerms: true,
          addOns: {
            select: {
              id: true,
              basePrice: true,
            },
          },
        },
      });

      if (employeeServices.length !== serviceIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "One or more services not found or employee cannot perform them",
        });
      }

      // Calculate max buffer and prep times from all services
      const maxBufferTime = Math.max(
        ...employeeServices.map((s) => s.bufferTime),
        0,
      );
      const maxPrepTime = Math.max(
        ...employeeServices.map((s) => s.prepTime),
        0,
      );

      // Validate add-ons if provided
      let validatedAddOnIds: string[] = [];
      let addOnsPrice = 0;

      if (addOnIds && addOnIds.length > 0) {
        // Get all available add-on IDs from the employee's services
        const availableAddOnIds = new Set(
          employeeServices.flatMap((service) =>
            service.addOns.map((addOn) => addOn.id),
          ),
        );

        // Validate that all requested add-ons are available
        const invalidAddOns = addOnIds.filter(
          (id) => !availableAddOnIds.has(id),
        );

        if (invalidAddOns.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "One or more add-ons are not available for the selected services or employee",
          });
        }

        validatedAddOnIds = addOnIds;

        // Calculate add-ons price
        addOnsPrice = employeeServices.reduce((sum, service) => {
          const serviceAddOnsPrice = service.addOns
            .filter((addOn) => validatedAddOnIds.includes(addOn.id))
            .reduce((addOnSum, addOn) => addOnSum + addOn.basePrice, 0);
          return sum + serviceAddOnsPrice;
        }, 0);
      }

      // Calculate total price from selected services and add-ons
      const totalPrice =
        employeeServices.reduce((sum, service) => sum + service.price, 0) +
        addOnsPrice;
      console.log({
        locationEmployeeId,
        startTime,
        endTime,
        locationId,
        bufferTime: maxBufferTime,
        prepTime: maxPrepTime,
      });
      // Check for conflicts
      const hasConflict = await isEditConflictFastFail({
        employeeId: locationEmployeeId,
        startTime,
        endTime,
        locationId,
        bufferTime: maxBufferTime,
        prepTime: maxPrepTime,
      });

      if (hasConflict) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Time slot is not available due to existing appointment, break, or time off",
        });
      }

      // Create the appointment
      const appointment = await prisma.appointment.create({
        data: {
          startTime,
          endTime,
          bufferTime: maxBufferTime,
          prepTime: maxPrepTime,
          customerId,
          locationId,
          price: totalPrice,
          service: {
            connect: serviceIds.map((id) => ({ id })),
          },
          ...(validatedAddOnIds.length > 0 && {
            addOns: {
              connect: validatedAddOnIds.map((id) => ({ id })),
            },
          }),
          status: "SCHEDULED",
        },
        include: {
          customer: true,
          service: {
            include: {
              serviceTerms: true,
            },
          },
          addOns: true,
        },
      });

      after(async () => {
        try {
          await sendAppointmentBookedEmail(appointment.id);
        } catch (error) {
          console.error(
            "[appointment.createAppointment] Failed to send appointment confirmation email",
            error,
          );
        }
      });

      return {
        success: true,
        appointment,
      };
    }),
});
