import { parseISO, isValid, format } from "date-fns";
import prisma from "../../../prisma";

export class ExceptionService {
  // -------------------------------------------------------------
  // CREATE RECURRING HOLIDAY
  // -------------------------------------------------------------
  static async createHoliday(
    locationId: string, 
    monthDay: string, // "12-25" format
    reason?: string
  ) {
    // Validate monthDay format (MM-DD)
    if (!/^\d{2}-\d{2}$/.test(monthDay)) {
      throw new Error("Invalid monthDay format. Use MM-DD (e.g., '12-25')");
    }

    return prisma.scheduleException.create({
      data: {
        targetType: "LOCATION",
        targetId: locationId,
        monthDay,
        startMinute: null, // all day
        endMinute: null,   // all day
        isBreak: true,
        reason: reason || `Holiday: ${monthDay}`,
      },
    });
  }

  // -------------------------------------------------------------
  // CREATE PARTIAL DAY EXCEPTION (e.g., early close)
  // -------------------------------------------------------------
  static async createPartialException(
    locationId: string,
    monthDay: string,
    startMinute: number,
    endMinute: number,
    isBreak: boolean = true,
    reason?: string
  ) {
    if (!/^\d{2}-\d{2}$/.test(monthDay)) {
      throw new Error("Invalid monthDay format. Use MM-DD");
    }

    if (startMinute < 0 || startMinute >= 1440 || endMinute < 0 || endMinute > 1440) {
      throw new Error("Minutes must be between 0 and 1440");
    }

    if (startMinute >= endMinute) {
      throw new Error("startMinute must be less than endMinute");
    }

    return prisma.scheduleException.create({
      data: {
        targetType: "LOCATION",
        targetId: locationId,
        monthDay,
        startMinute,
        endMinute,
        isBreak,
        reason,
      },
    });
  }

  // -------------------------------------------------------------
  // GET ALL HOLIDAYS FOR LOCATION
  // -------------------------------------------------------------
  static async getFullDayHolidays(locationId: string) {
    return prisma.scheduleException.findMany({
      where: {
        targetType: "LOCATION",
        targetId: locationId,
        startMinute: null,
        endMinute: null,
        isBreak: true
      },
      orderBy: {
        monthDay: "asc",
      },
    });
  }

  // -------------------------------------------------------------
  // CHECK IF A DATE IS HOLIDAY OR HAS EXCEPTION
  // -------------------------------------------------------------
  static async getExceptionForDate(locationId: string, dateStr: string) {
    const date = parseISO(dateStr);
    if (!isValid(date)) throw new Error("Invalid date");

    const monthDay = format(date, "MM-dd");

    return prisma.scheduleException.findFirst({
      where: {
        targetType: "LOCATION",
        targetId: locationId,
        monthDay,
      },
    });
  }

  // -------------------------------------------------------------
  // CHECK IF DATE IS A FULL-DAY CLOSURE
  // -------------------------------------------------------------
  static async isFullDayClosure(locationId: string, dateStr: string) {
    const exception = await this.getExceptionForDate(locationId, dateStr);
    
    if (!exception) return false;
    
    // Full day if startMinute and endMinute are both null, OR cover entire day
    return (
      exception.isBreak && 
      (
        (exception.startMinute === null && exception.endMinute === null) ||
        (exception.startMinute === 0 && exception.endMinute === 1440)
      )
    );
  }

  // -------------------------------------------------------------
  // GET ALL EXCEPTIONS FOR A DATE RANGE
  // (useful for calendar views)
  // -------------------------------------------------------------
  static async getExceptionsInRange(
    locationId: string,
    startDate: Date,
    endDate: Date
  ) {
    const exceptions = await prisma.scheduleException.findMany({
      where: {
        targetType: "LOCATION",
        targetId: locationId,
      },
    });

    // Filter to only exceptions that fall within the date range
    return exceptions.filter(exception => {
      const [month, day] = exception.monthDay.split('-').map(Number);
      
      // Check each year in the range
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();
      
      for (let year = startYear; year <= endYear; year++) {
        const exceptionDate = new Date(year, month - 1, day);
        if (exceptionDate >= startDate && exceptionDate <= endDate) {
          return true;
        }
      }
      
      return false;
    });
  }

  // -------------------------------------------------------------
  // UPDATE EXCEPTION
  // -------------------------------------------------------------
  static async updateException(
    exceptionId: string,
    data: {
      startMinute?: number | null;
      endMinute?: number | null;
      isBreak?: boolean;
      reason?: string;
    }
  ) {
    return prisma.scheduleException.update({
      where: { id: exceptionId },
      data,
    });
  }

  // -------------------------------------------------------------
  // DELETE EXCEPTION
  // -------------------------------------------------------------
  static async deleteException(exceptionId: string) {
    return prisma.scheduleException.delete({
      where: { id: exceptionId },
    });
  }
}