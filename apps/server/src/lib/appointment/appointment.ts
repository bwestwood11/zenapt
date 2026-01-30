import prisma from "../../../prisma";
import { AppointmentStatus } from "../../../prisma/generated/enums";

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

const toMinute = (d: Date) => d.getHours() * 60 + d.getMinutes();

const dayToBit = (d: Date) => 1 << d.getDay();

const toMonthDay = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fromMinute = (base: Date, m: number) => {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(m);
  return d;
};

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
  const effectiveStart = addMinutes(startTime, -(prepTime || 0));
  const effectiveEnd = addMinutes(endTime, bufferTime || 0);

  const startMin = toMinute(startTime);
  const endMin = toMinute(endTime);
  const effectiveStartMin = toMinute(effectiveStart);
  const effectiveEndMin = toMinute(effectiveEnd);
  console.log({ effectiveStartMin, effectiveEndMin });
  const dayMask = dayToBit(startTime);
  const monthDay = toMonthDay(startTime);

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
    const workWindows = todayRules.filter((r) => !r.isBreak);

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

  const dayMask = 1 << date.getDay();
  const monthDay = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

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
        status: {
          notIn: ["CANCELED", "NO_SHOW"],
        },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
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

  // EMPLOYEE wins if present
  const effectiveRules =
    employeeRules.length > 0 ? employeeRules : locationRules;

  // no rules = closed
  if (effectiveRules.length === 0) {
    return [];
  }
  const workWindows: MinuteRange[] = effectiveRules
    .filter((r) => !r.isBreak)
    .map((r) => ({ start: r.startMinute, end: r.endMinute }));

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
      start: toMinute(
        new Date(Math.max(t.startDate.getTime(), dayStart.getTime())),
      ),
      end: toMinute(new Date(Math.min(t.endDate.getTime(), dayEnd.getTime()))),
    });
  });

  // appointments (+ buffer/prep)
  appointments.forEach((a) => {
    blocked.push({
      start: toMinute(a.startTime) - prepTime,
      end: toMinute(a.endTime) + bufferTime,
    });
  });

  console.log({ blocked });
  console.log({ workWindows });
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
          start: fromMinute(date, candidate.start),
          end: fromMinute(date, candidate.end),
        });
      }

      cursor += duration; // ← fixed-step slots (fast)
    }
  }

  return slots;
}
