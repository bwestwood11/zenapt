import prisma from "../../../prisma";
import { AppointmentStatus } from "@prisma/client";
import {
  dateAtMinutesInTimeZone,
  getDayBitInTimeZone,
  getMinutesInTimeZone,
  getMonthDayInTimeZone,
  getZonedDayRangeUtc,
} from "../datetime/timezone";

async function firstTrue(
  tasks: Array<() => Promise<boolean>>,
): Promise<boolean> {
  return new Promise((resolve) => {
    let pending = tasks.length;
    let done = false;

    for (const task of tasks) {
      task()
        .then((result) => {
          if (done) return;
          if (result) {
            done = true;
            resolve(true);
          } else if (--pending === 0) {
            resolve(false);
          }
        })
        .catch(() => {
          if (!done && --pending === 0) resolve(false);
        });
    }
  });
}

type EditConflictInput = {
  appointmentId?: string;
  employeeId: string;
  locationId: string;
  startTime: Date;
  endTime: Date;
  bufferTime?: number;
  prepTime?: number;
};

const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);

const overlaps = (a: MinuteRange, b: MinuteRange) =>
  a.start < b.end && a.end > b.start;

export async function isEditConflictFastFail(
  input: EditConflictInput,
): Promise<boolean> {
  const {
    appointmentId,
    employeeId,
    endTime,
    locationId,
    startTime,
    bufferTime,
    prepTime,
  } = input;

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { timeZone: true },
  });

  const locationTimeZone = location?.timeZone || "UTC";

  // Calculate prep/buffer from appointment services only if not provided and appointmentId exists
  let effectivePrepTime = prepTime ?? 0;
  let effectiveBufferTime = bufferTime ?? 0;

  if ((prepTime == null || bufferTime == null) && appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        service: {
          select: {
            serviceTerms: { select: { id: true } },
          },
        },
      },
    });

    if (appointment) {
      const services = await prisma.employeeService.findMany({
        where: {
          serviceTerms: {
            id: {
              in: appointment.service.map((s) => s.serviceTerms.id),
            },
          },
          locationEmployeeId: employeeId,
        },
        select: {
          prepTime: true,
          bufferTime: true,
        },
      });

      if (services.length > 0) {
        effectivePrepTime =
          prepTime ?? Math.max(...services.map((s) => s.prepTime), 0);
        effectiveBufferTime =
          bufferTime ?? Math.max(...services.map((s) => s.bufferTime), 0);
      }
    }
  }

  const effectiveStart = addMinutes(startTime, -effectivePrepTime);
  const effectiveEnd = addMinutes(endTime, effectiveBufferTime);

  const effectiveStartMin = getMinutesInTimeZone(effectiveStart, locationTimeZone);
  const effectiveEndMin = getMinutesInTimeZone(effectiveEnd, locationTimeZone);
  const dayMask = getDayBitInTimeZone(startTime, locationTimeZone);
  const monthDay = getMonthDayInTimeZone(startTime, locationTimeZone);

  const appointmentConflict = () =>
    prisma.appointment
      .findFirst({
        where: {
          id: { not: appointmentId },
          service: {
            some: {
              locationEmployeeId: employeeId,
            },
          },
          status: {
            notIn: [AppointmentStatus.CANCELED, AppointmentStatus.NO_SHOW],
          },
          startTime: { lt: effectiveEnd },
          endTime: { gt: effectiveStart },
          locationId,
        },
        select: { id: true },
      })
      .then(Boolean);

  const timeOffConflict = () =>
    prisma.timeOff
      .findFirst({
        where: {
          OR: [
            { targetType: "LOCATION", targetId: locationId },
            { targetType: "EMPLOYEE", targetId: employeeId },
          ],
          startDate: { lt: effectiveEnd },
          endDate: { gt: effectiveStart },
        },
        select: { id: true },
      })
      .then(Boolean);

  const exceptionConflict = () =>
    prisma.scheduleException
      .findMany({
        where: {
          OR: [
            { targetType: "LOCATION", targetId: locationId },
            { targetType: "EMPLOYEE", targetId: employeeId },
          ],
          monthDay,
        },
        select: {
          startMinute: true,
          endMinute: true,
          isBreak: true,
        },
      })
      .then((exs) =>
        exs.some(
          (ex) =>
            ex.isBreak &&
            (ex.startMinute == null ||
              ex.endMinute == null ||
              (effectiveStartMin < ex.endMinute &&
                effectiveEndMin > ex.startMinute)),
        ),
      );

  const breakConflict = async () => {
    const rules = await prisma.scheduleRule.findMany({
      where: {
        OR: [
          { targetType: "LOCATION", targetId: locationId },
          { targetType: "EMPLOYEE", targetId: employeeId },
        ],
      },
      select: {
        startMinute: true,
        endMinute: true,
        isBreak: true,
        daysMask: true,
        targetId: true,
        targetType: true,
      },
    });

    const todayRules = rules.filter((r) => (r.daysMask & dayMask) !== 0);

    if (todayRules.length === 0) return true; // closed day → conflict

    /* ---------- BREAK CHECK ---------- */
    if (
      todayRules.some(
        (r) =>
          r.isBreak &&
          effectiveStartMin < r.endMinute &&
          effectiveEndMin > r.startMinute,
      )
    ) {
      return true;
    }

    /* ---------- WORK HOURS CHECK ---------- */
    // Split by target - employee rules take priority over location rules
    const employeeRules = todayRules.filter(
      (r) => r.targetType === "EMPLOYEE" && r.targetId === employeeId,
    );
    const locationRules = todayRules.filter(
      (r) => r.targetType === "LOCATION" && r.targetId === locationId,
    );

    const employeeWorkWindow = employeeRules.filter((r) => !r.isBreak);
    const workWindows = employeeWorkWindow.length > 0 ? employeeWorkWindow : locationRules.filter(r => !r.isBreak)
    console.log({ workWindows });
    if (workWindows.length === 0) return true; // no work hours → conflict

    const insideAnyWorkWindow = workWindows.some(
      (w) =>
        effectiveStartMin >= w.startMinute && effectiveEndMin <= w.endMinute,
    );

    return !insideAnyWorkWindow;
  };

  return firstTrue([
    appointmentConflict,
    timeOffConflict,
    exceptionConflict,
    breakConflict,
  ]);
}

type AvailableTimingInput = {
  employeeId: string;
  locationId: string;
  date: Date;
  duration: number; // minutes
  bufferTime?: number;
  prepTime?: number;
};

type TimeRange = {
  start: Date;
  end: Date;
};

type MinuteRange = {
  start: number;
  end: number;
};

export async function getAvailableTimings(
  input: AvailableTimingInput,
): Promise<TimeRange[]> {
  const {
    employeeId,
    locationId,
    date,
    duration,
    bufferTime = 0,
    prepTime = 0,
  } = input;

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { timeZone: true },
  });

  if (!location) return [];

  const locationTimeZone = location.timeZone || "UTC";
  const dayMask = getDayBitInTimeZone(date, locationTimeZone);
  const monthDay = getMonthDayInTimeZone(date, locationTimeZone);
  const { dayStartUtc: dayStart, dayEndUtc: dayEnd } = getZonedDayRangeUtc(
    date,
    locationTimeZone,
  );

  /* ---------------- FETCH EVERYTHING ---------------- */
  const [rules, exceptions, timeOffs, appointments] = await Promise.all([
    prisma.scheduleRule.findMany({
      where: {
        OR: [
          { targetType: "LOCATION", targetId: locationId },
          { targetType: "EMPLOYEE", targetId: employeeId },
        ],
      },
    }),

    prisma.scheduleException.findMany({
      where: {
        OR: [
          { targetType: "LOCATION", targetId: locationId },
          { targetType: "EMPLOYEE", targetId: employeeId },
        ],
        monthDay,
      },
    }),

    prisma.timeOff.findMany({
      where: {
        OR: [
          { targetType: "LOCATION", targetId: locationId },
          { targetType: "EMPLOYEE", targetId: employeeId },
        ],
        startDate: { lt: dayEnd },
        endDate: { gt: dayStart },
      },
    }),

    prisma.appointment.findMany({
      where: {
        locationId,
        service: {
          some: {
            locationEmployeeId: employeeId,
          },
        },
        status: {
          notIn: ["CANCELED", "NO_SHOW"],
        },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: {
        startTime: true,
        endTime: true,
        bufferTime: true,
        prepTime: true,
      },
    }),
  ]);

  /* ---------------- WORK WINDOWS ---------------- */

  const todayRules = rules.filter((r) => (r.daysMask & dayMask) !== 0);
 
  // split by target
  const employeeRules = todayRules.filter(
    (r) => r.targetType === "EMPLOYEE" && r.targetId === employeeId,
  );

  const locationRules = todayRules.filter(
    (r) => r.targetType === "LOCATION" && r.targetId === locationId,
  );
  const employeeWorkWindows: MinuteRange[] = employeeRules
    .filter((r) => !r.isBreak)
    .map((r) => ({ start: r.startMinute, end: r.endMinute }));


  const locationWorkWindows = locationRules
    .filter((r) => !r.isBreak)
    .map((r) => ({ start: r.startMinute, end: r.endMinute }));


  const workWindows =
    employeeWorkWindows.length > 0 ? employeeWorkWindows : locationWorkWindows;

  if (workWindows.length === 0) return [];

  /* ---------------- BLOCKED WINDOWS ---------------- */

  const blocked: MinuteRange[] = [];

  // breaks
  todayRules
    .filter((r) => r.isBreak)
    .forEach((r) => blocked.push({ start: r.startMinute, end: r.endMinute }));

  // exceptions
  exceptions
    .filter((e) => e.isBreak)
    .forEach((e) => {
      if (e.startMinute != null && e.endMinute != null) {
        blocked.push({ start: e.startMinute, end: e.endMinute });
      }
    });

  // time off
  timeOffs.forEach((t) => {
    blocked.push({
      start: getMinutesInTimeZone(
        new Date(Math.max(t.startDate.getTime(), dayStart.getTime())),
        locationTimeZone,
      ),
      end: getMinutesInTimeZone(
        new Date(Math.min(t.endDate.getTime(), dayEnd.getTime())),
        locationTimeZone,
      ),
    });
  });

  // appointments (+ buffer/prep) - use each appointment's own buffer/prep times
  appointments.forEach((a) => {
    blocked.push({
      start: getMinutesInTimeZone(a.startTime, locationTimeZone) - (a.prepTime || 0),
      end: getMinutesInTimeZone(a.endTime, locationTimeZone) + (a.bufferTime || 0),
    });
  });

  /* ---------------- SLOT GENERATION ---------------- */

  const slots: TimeRange[] = [];

  for (const window of workWindows) {
    let cursor = window.start;

    while (cursor + duration <= window.end) {
      const candidate: MinuteRange = {
        start: cursor,
        end: cursor + duration,
      };
      const hasConflict = blocked.some((b) => overlaps(candidate, b));

      if (!hasConflict) {
        slots.push({
          start: dateAtMinutesInTimeZone(date, candidate.start, locationTimeZone),
          end: dateAtMinutesInTimeZone(date, candidate.end, locationTimeZone),
        });
      }

      cursor += duration; // ← fixed-step slots (fast)
    }
  }
  return slots;
}
