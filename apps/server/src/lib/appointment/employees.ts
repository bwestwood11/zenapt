import prisma from "../../../prisma";
import {
  AppointmentPaymentStatus,
  AppointmentStatus,
} from "../../../prisma/generated/enums";
import {
  getDateKeyInTimeZone,
  getDayBitInTimeZone,
  getMonthDayInTimeZone,
  getZonedDayRangeUtc,
  zonedDateTimeToUtc,
} from "../datetime/timezone";

function parseDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return { year, month, day };
}

function getZonedDayRangeUtcFromDateKey(dateKey: string, timeZone: string) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;

  const dayStartUtc = zonedDateTimeToUtc(timeZone, {
    year: parsed.year,
    month: parsed.month,
    day: parsed.day,
    hour: 0,
    minute: 0,
    second: 0,
  });

  const nextDayUtcRef = new Date(
    Date.UTC(parsed.year, parsed.month - 1, parsed.day + 1),
  );

  const dayEndUtc = zonedDateTimeToUtc(timeZone, {
    year: nextDayUtcRef.getUTCFullYear(),
    month: nextDayUtcRef.getUTCMonth() + 1,
    day: nextDayUtcRef.getUTCDate(),
    hour: 0,
    minute: 0,
    second: 0,
  });

  return {
    dayStartUtc,
    dayEndUtc,
    year: parsed.year,
    month: parsed.month,
    day: parsed.day,
  };
}

type MinuteRange = {
  startMinute: number;
  endMinute: number;
};

type Appointment = {
  startTime: Date;
  endTime: Date;
  id: string;
  status: AppointmentStatus;
  paymentStatus: AppointmentPaymentStatus;
  price: number;
  employeeId: string;
  service: {
    price: number;
    locationEmployeeId: string;
    duration: number;
    id: string;
    name: string;
  }[];
  customer: {
    name: string;
    id: string;
  };

  bufferTime: number;
  prepTime: number;
};

type AppointmentResponseType = Record<string, Appointment[]>;

export async function getLocationSpecialistsSchedule(
  locationId: string,
  date: Date,
  dateKey?: string,
) {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { timeZone: true },
  });

  if (!location) {
    return { code: "LOCATION_OFF" as const, timeZone: "UTC" };
  }

  const locationTimeZone = location.timeZone || "UTC";

  const zonedDayRange = dateKey
    ? getZonedDayRangeUtcFromDateKey(dateKey, locationTimeZone)
    : null;

  const effectiveDate = zonedDayRange
    ? zonedDateTimeToUtc(locationTimeZone, {
        year: zonedDayRange.year,
        month: zonedDayRange.month,
        day: zonedDayRange.day,
        hour: 12,
        minute: 0,
        second: 0,
      })
    : date;

  const dayBit = getDayBitInTimeZone(effectiveDate, locationTimeZone);
  const monthDay = zonedDayRange
    ? `${String(zonedDayRange.month).padStart(2, "0")}-${String(zonedDayRange.day).padStart(2, "0")}`
    : getMonthDayInTimeZone(effectiveDate, locationTimeZone);
  const { dayStartUtc, dayEndUtc } =
    zonedDayRange ?? getZonedDayRangeUtc(effectiveDate, locationTimeZone);

  const employees = await prisma.locationEmployee.findMany({
    where: { locationId, role: "LOCATION_SPECIALIST" },
    select: {
      id: true,
      role: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  const employeeIds = employees.map((e) => e.id);

  const [rules, exceptions, timeoffs] = await Promise.all([
    prisma.scheduleRule.findMany({
      where: {
        OR: [
          { targetType: "EMPLOYEE", targetId: { in: employeeIds } },
          { targetType: "LOCATION", targetId: locationId },
        ],
      },
    }),
    prisma.scheduleException.findMany({
      where: {
        monthDay,
        OR: [
          { targetType: "EMPLOYEE", targetId: { in: employeeIds } },
          { targetType: "LOCATION", targetId: locationId },
        ],
      },
    }),
    prisma.timeOff.findMany({
      where: {
        targetType: "EMPLOYEE",
        targetId: { in: employeeIds },
        startDate: { lte: dayEndUtc },
        endDate: { gte: dayStartUtc },
      },
    }),
  ]);

  // ---------- LOCATION OFF ----------
  const locationClosedByException = exceptions.some(
    (e) =>
      e.targetType === "LOCATION" &&
      e.targetId === locationId &&
      e.isBreak &&
      e.startMinute == null &&
      e.endMinute == null,
  );

  const locationWorkRule = rules.find(
    (r) =>
      r.targetType === "LOCATION" &&
      r.targetId === locationId &&
      !r.isBreak &&
      (r.daysMask & dayBit) !== 0,
  );

  if (locationClosedByException || !locationWorkRule) {
    return { code: "LOCATION_OFF" as const, timeZone: locationTimeZone };
  }

  // ---------- EMPLOYEE SCHEDULE ----------
  const schedule = employees.map((employee) => {
    const employeeId = employee.id;

    const timeOff = timeoffs.find((t) => t.targetId === employeeId);
    if (timeOff) {
      return {
        code: "EMPLOYEE_OFF" as const,
        timeOff,
        employee: { ...employee.user, role: employee.role },
      };
    }

    const employeeWorkRule = rules.find(
      (r) =>
        r.targetType === "EMPLOYEE" &&
        r.targetId === employeeId &&
        !r.isBreak &&
        (r.daysMask & dayBit) !== 0,
    );

    const workRule = employeeWorkRule ?? locationWorkRule;

    // ZERO-HOUR RULE = OFF (for weekly off like Saturday)
    if (!workRule || workRule.startMinute === workRule.endMinute) {
      return {
        code: "EMPLOYEE_OFF" as const,
        timeOff: null,
        employee: { ...employee.user, role: employee.role },
      };
    }

    const recurringBreaks = rules.filter(
      (r) =>
        r.isBreak &&
        (r.daysMask & dayBit) !== 0 &&
        ((r.targetType === "EMPLOYEE" && r.targetId === employeeId) ||
          (r.targetType === "LOCATION" && r.targetId === locationId)),
    );

    const exceptionBreaks = exceptions.filter(
      (e) =>
        e.isBreak &&
        ((e.targetType === "EMPLOYEE" && e.targetId === employeeId) ||
          (e.targetType === "LOCATION" && e.targetId === locationId)),
    );

    const isExceptionBreak = exceptionBreaks.some(
      (a) =>
        !a.startMinute &&
        !a.endMinute &&
        a.isBreak &&
        a.targetType === "EMPLOYEE",
    );
    if (isExceptionBreak) {
      return {
        code: "EMPLOYEE_OFF" as const,
        timeOff: null,
        employee: {
          ...employee.user,
          role: employee.role,
          id: employee.id,
          userId: employee.user.id,
        },
      };
    }

    const breaks: MinuteRange[] = [
      ...recurringBreaks.map((b) => ({
        startMinute: b.startMinute,
        endMinute: b.endMinute,
      })),
      ...exceptionBreaks
        .filter((e) => e.startMinute != null && e.endMinute != null)
        .map((e) => ({
          startMinute: e.startMinute!,
          endMinute: e.endMinute!,
        })),
    ];

    return {
      code: "WORKING" as const,
      employee: {
        ...employee.user,
        role: employee.role,
        id: employee.id,
        userId: employee.user.id,
      },
      workHours: {
        startMinute: workRule.startMinute,
        endMinute: workRule.endMinute,
      },
      breaks,
    };
  });

  return {
    code: "SUCCESS" as const,
    timeZone: locationTimeZone,
    schedule,
  };
}

export async function getAppointmentsInRange({
  startDate,
  endDate,
  locationId,
  dateKey,
}: {
  startDate?: Date;
  endDate?: Date;
  locationId: string;
  dateKey?: string;
}) {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { timeZone: true },
  });

  const locationTimeZone = location?.timeZone ?? "UTC";

  const zonedDayRange = dateKey
    ? getZonedDayRangeUtcFromDateKey(dateKey, locationTimeZone)
    : null;

  const rangeStartSource =
    zonedDayRange ?? getZonedDayRangeUtc(startDate ?? new Date(), locationTimeZone);
  const rangeEndSource =
    zonedDayRange ??
    getZonedDayRangeUtc(endDate ?? startDate ?? new Date(), locationTimeZone);

  const { dayStartUtc: rangeStartUtc } = rangeStartSource;
  const { dayEndUtc: rangeEndUtc } = rangeEndSource;

  const appointments = await prisma.appointment.findMany({
    where: {
      locationId,
      startTime: { gte: rangeStartUtc },
      endTime: { lt: rangeEndUtc },
    },
    select: {
      endTime: true,
      startTime: true,
      id: true,
      status: true,
      paymentStatus: true,
      price: true,
      bufferTime: true,
      prepTime: true,
      service: {
        select: {
          price: true,
          locationEmployeeId: true,
          duration: true,
          id: true,
          serviceTerms: {
            select: {
              name: true,
            },
          },
        },
      },
      customer: {
        select: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          id: true,
        },
      },
    },
  });
  if (!appointments) return {};

  const appointmentByEmployees = appointments.reduce<AppointmentResponseType>(
    (acc, appointment) => {
      const currentDateKey = getDateKeyInTimeZone(
        appointment.startTime,
        locationTimeZone,
      );

      if (!acc[currentDateKey]) {
        acc[currentDateKey] = [];
      }
      if (!appointment.service || appointment.service.length === 0) {
        console.error(
          `Appointment ${appointment.id} has no services assigned.`,
        );
        return acc;
      }
      const employeeId = appointment.service.every(
        (a) =>
          a.locationEmployeeId &&
          a.locationEmployeeId === appointment.service[0].locationEmployeeId,
      )
        ? appointment.service[0].locationEmployeeId
        : null;
      if (!employeeId) {
        console.error(
          `Appointment ${appointment.id} has multiple employees assigned.`,
        );
        return acc;
      }

      const appointmentWithEmployee: Appointment = {
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        id: appointment.id,
        employeeId: employeeId,
        price: appointment.price,
        status: appointment.status,
        paymentStatus: appointment.paymentStatus,
        bufferTime: appointment.bufferTime,
        prepTime: appointment.prepTime,
        service: appointment.service
          .filter((s) => s.locationEmployeeId !== null)
          .map((s) => ({
            price: s.price,
            locationEmployeeId: s.locationEmployeeId!,
            duration: s.duration,
            id: s.id,
            name: s.serviceTerms.name,
          })),
        customer: {
          name: appointment.customer.user.name,

          id: appointment.customer.id,
        },
      };
      acc[currentDateKey].push(appointmentWithEmployee);
      return acc;
    },
    {},
  );

  return appointmentByEmployees;
}
