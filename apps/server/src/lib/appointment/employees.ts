import App from "next/app";
import prisma from "../../../prisma";
import { AppointmentStatus } from "../../../prisma/generated/enums";

function dayToBit(date: Date): number {
  return 1 << date.getDay();
}

function toMonthDay(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
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
) {
  const dayBit = dayToBit(date);
  const monthDay = toMonthDay(date);

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
        startDate: { lte: date },
        endDate: { gte: date },
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
    return { code: "LOCATION_OFF" as const };
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
    schedule,
  };
}

export async function getAppointmentsInRange({
  startDate,
  endDate,
  locationId,
}: {
  startDate: Date;
  endDate: Date;
  locationId: string;
}) {
  const appointments = await prisma.appointment.findMany({
    where: {
      locationId,
      startTime: { gte: startDate },
      endTime: { lte: endDate },
    },
    select: {
      endTime: true,
      startTime: true,
      id: true,
      status: true,
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
      const currentDate = new Date(
        appointment.startTime.getFullYear(),
        appointment.startTime.getMonth(),
        appointment.startTime.getDate(),
        0,
        0,
        0,
        0,
      );
      if (!acc[currentDate.toISOString()]) {
        acc[currentDate.toISOString()] = [];
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
      acc[currentDate.toISOString()].push(appointmentWithEmployee);
      return acc;
    },
    {},
  );

  return appointmentByEmployees;
}
