import z from "zod";
import { publicProcedure, router } from "../lib/trpc";
import { TRPCError } from "@trpc/server";
import { Cal_API_Version } from "../lib/cal";
import prisma from "../../prisma";

const BookDemo = publicProcedure
  .input(
    z.object({
      firstName: z.string().min(2, "First name must be at least 2 characters"),
      lastName: z.string().min(2, "Last name must be at least 2 characters"),
      businessName: z
        .string()
        .min(2, "Business name must be at least 2 characters"),
      email: z.string().email("Please enter a valid email address"),
      cellPhone: z.string().min(10, "Please enter a valid phone number"),
      numberOfLocations: z.string().min(1, "Please select number of locations"),
      zipCode: z.string().min(5, "Please enter a valid zip code"),
      websiteUrl: z
        .string()
        .url("Please enter a valid website URL")
        .optional()
        .or(z.literal("")),
      demoTime: z
        .date({
          message: "Please select a demo date",
        })
        .min(new Date()),
      timeZone: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const {
      demoTime,
      firstName,
      lastName,
      email,
      timeZone,
      cellPhone,
      numberOfLocations,
      websiteUrl,
      businessName,
      zipCode,
    } = input;
    const response = await fetch(`https://api.cal.com/v2/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CALAPIKEY}`,
        "cal-api-version": Cal_API_Version,
      },
      body: JSON.stringify({
        start: demoTime,
        eventTypeId: parseInt(process.env.EVENTTYPEID!),
        attendee: {
          name: `${firstName} ${lastName}`,
          email: email,
          timeZone: timeZone,
          phoneNumber: cellPhone,
        },
        metadata: {
          numberOfLocations,
          websiteUrl,
          businessName,
          zipCode,
        },
      }),
    });

    if (!response.ok) {
      console.error("Error While Booking", response);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong while booking",
      });
    }

    const addToDatabase = await prisma.demoRequest.create({
      data: {
        firstName,
        lastName,
        email,
        cellPhone,
        numberOfLocations,
        websiteUrl: websiteUrl || "",
        businessName,
        zipCode,
        demoTime: demoTime.toISOString(),
      },
    });

    return "OK";
  });

function getDayRangeISO(date: Date) {
  const start = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0
    )
  );
  const end = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59
    )
  );
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

const GetBookingSlots = publicProcedure
  .input(z.object({ date: z.date() }))
  .query(async ({ input: { date } }) => {
    try {
      const { start, end } = getDayRangeISO(date);

      const url = new URL("https://api.cal.com/v2/slots/available");
      url.searchParams.set("startTime", start);
      url.searchParams.set("endTime", end);
      url.searchParams.set("eventTypeId", process.env.eventTypeId ?? "");

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.calAPIKey}`,
        },
      });

      if (!response.ok) {
        throw new TRPCError({
          message: `Cal.com API error: ${response.statusText}`,
          code: "BAD_GATEWAY",
        });
      }

      type CalSlotsResponse = {
        status: "success" | "error";
        error?: string;
        data?: { slots: Record<string, { time: string }[]> };
      };

      const data: CalSlotsResponse = await response.json();

      if (data.status !== "success" || !data.data?.slots) {
        throw new TRPCError({
          message: data.error || "Invalid response from Cal.com",
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      // Flatten & normalize times into local timezone display
      const firstDateKey = Object.keys(data.data.slots)[0];
      const slots = data.data.slots[firstDateKey] || [];

      return slots;
    } catch (err) {
      console.error("GetBookingSlots error:", err);
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({
        message: "Something went wrong fetching booking slots",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  });

export const marketingRouter = router({
  createBookDemo: BookDemo,
  getAvailableSlots: GetBookingSlots,
});
