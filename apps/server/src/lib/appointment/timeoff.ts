import { parseISO, isValid, startOfDay, endOfDay } from "date-fns";
import { ScheduleTargetType } from "../../../prisma/generated/enums";
import prisma from "../../../prisma";

export class TimeOffService {
  // -------------------------------------------------------------
  // GET APPROVED TIME OFFS
  // -------------------------------------------------------------
  static async getTimeOffs(
    targetType: ScheduleTargetType,
    targetId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const where: any = {
      targetType,
      targetId,
    };

    if (filters?.startDate || filters?.endDate) {
      where.AND = [];

      if (filters.startDate) {
        where.AND.push({
          endDate: { gte: filters.startDate },
        });
      }

      if (filters.endDate) {
        where.AND.push({
          startDate: { lte: filters.endDate },
        });
      }
    }

    return prisma.timeOff.findMany({
      where,
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  // -------------------------------------------------------------
  // CHECK IF DATE HAS TIME OFF (approved only)
  // -------------------------------------------------------------
  static async hasTimeOffOnDate(
    targetType: ScheduleTargetType,
    targetId: string,
    date: Date | string
  ) {
    const checkDate = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(checkDate)) {
      throw new Error("Invalid date");
    }

    const timeOff = await prisma.timeOff.findFirst({
      where: {
        targetType,
        targetId,
        startDate: { lte: endOfDay(checkDate) },
        endDate: { gte: startOfDay(checkDate) },
      },
    });

    return timeOff !== null;
  }

  // -------------------------------------------------------------
  // GET TIME OFF FOR DATE
  // -------------------------------------------------------------
  static async getTimeOffForDate(
    targetType: ScheduleTargetType,
    targetId: string,
    date: Date | string
  ) {
    const checkDate = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(checkDate)) {
      throw new Error("Invalid date");
    }

    return prisma.timeOff.findMany({
      where: {
        targetType,
        targetId,
        startDate: { lte: endOfDay(checkDate) },
        endDate: { gte: startOfDay(checkDate) },
      },
    });
  }

  // -------------------------------------------------------------
  // CHECK FOR OVERLAPPING TIME OFF (approved only)
  // -------------------------------------------------------------
  static async hasOverlappingTimeOff(
    targetType: ScheduleTargetType,
    targetId: string,
    startDate: Date,
    endDate: Date,
    excludeRequestId?: string
  ) {
    const where: any = {
      targetType,
      targetId,
      OR: [
        {
          // New period starts during existing period
          AND: [
            { startDate: { lte: startDate } },
            { endDate: { gte: startDate } },
          ],
        },
        {
          // New period ends during existing period
          AND: [
            { startDate: { lte: endDate } },
            { endDate: { gte: endDate } },
          ],
        },
        {
          // New period completely contains existing period
          AND: [
            { startDate: { gte: startDate } },
            { endDate: { lte: endDate } },
          ],
        },
      ],
    };

    if (excludeRequestId) {
      where.requestId = { not: excludeRequestId };
    }

    const overlapping = await prisma.timeOff.findFirst({ where });
    return overlapping !== null;
  }

  // -------------------------------------------------------------
  // GET TIME OFFS IN RANGE (for availability calculations)
  // -------------------------------------------------------------
  static async getTimeOffsInRange(
    targetType: ScheduleTargetType,
    targetId: string,
    startDate: Date,
    endDate: Date
  ) {
    return prisma.timeOff.findMany({
      where: {
        targetType,
        targetId,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  // -------------------------------------------------------------
  // DELETE TIME OFF (when request is cancelled/denied)
  // This is typically called via TimeOffRequestService
  // -------------------------------------------------------------
//   static async deleteTimeOff(requestId: string) {
//     return prisma.timeOff.delete({
//       where: { requestId },
//     });
//   }
}