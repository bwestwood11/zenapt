import prisma from "../../../prisma";
import { ScheduleTargetType } from "@prisma/client";

const WORK_RULE_TYPE = ScheduleTargetType.LOCATION; // adjust if enum requires uppercase
const EMPLOYEE_RULE_TYPE = ScheduleTargetType.EMPLOYEE;

export type WeeklyScheduleView = {
  day: number // 0 = Sun ... 6 = Sat
  enabled: boolean
  startMinute?: number
  endMinute?: number
}

export type RecurringBreakView = {
  id: string;
  day: number;
  startMinute: number;
  endMinute: number;
}

type WeeklyScheduleInput = {
  locationId: string;
  rules: WeeklyScheduleView[];
};

type EmployeeWeeklyScheduleInput = {
  locationEmployeeId: string;
  rules: WeeklyScheduleView[];
};

function dayToMask(day: number) {
  return 1 << day;
}

function sortRecurringBreaks<T extends { day: number; startMinute: number }>(
  rules: T[],
) {
  return [...rules].sort(
    (left, right) =>
      left.day - right.day || left.startMinute - right.startMinute,
  );
}

async function updateTargetWeeklySchedule({
  targetType,
  targetId,
  rules,
}: {
  targetType: ScheduleTargetType;
  targetId: string;
  rules: WeeklyScheduleView[];
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.scheduleRule.findMany({
      where: {
        targetType,
        targetId,
        isBreak: false,
      },
    });

    for (const rule of rules) {
      const mask = dayToMask(rule.day);
      const existingRecord = existing.find((r) => r.daysMask === mask);

      if (!rule.enabled) {
        if (existingRecord) {
          await tx.scheduleRule.delete({
            where: { id: existingRecord.id },
          });
        }
        continue;
      }

      if (rule.startMinute == null || rule.endMinute == null) {
        throw new Error(`Missing time range for enabled weekday: ${rule.day}`);
      }

      if (existingRecord) {
        await tx.scheduleRule.update({
          where: { id: existingRecord.id },
          data: {
            startMinute: rule.startMinute,
            endMinute: rule.endMinute,
          },
        });
      } else {
        await tx.scheduleRule.create({
          data: {
            targetType,
            targetId,
            daysMask: mask,
            startMinute: rule.startMinute,
            endMinute: rule.endMinute,
            isBreak: false,
          },
        });
      }
    }

    return { status: "ok" };
  });
}

async function getWeeklyScheduleByTarget({
  targetType,
  targetId,
}: {
  targetType: ScheduleTargetType;
  targetId: string;
}): Promise<WeeklyScheduleView[]> {
  const rules = await prisma.scheduleRule.findMany({
    where: {
      targetType,
      targetId,
      isBreak: false,
    },
  });

  const map = new Map<number, { startMinute: number; endMinute: number }>();

  for (const r of rules) {
    map.set(r.daysMask, {
      startMinute: r.startMinute,
      endMinute: r.endMinute,
    });
  }

  const response: WeeklyScheduleView[] = [];

  for (let day = 0; day < 7; day++) {
    const mask = dayToMask(day);
    const entry = map.get(mask);

    response.push(
      entry
        ? {
            day,
            enabled: true,
            startMinute: entry.startMinute,
            endMinute: entry.endMinute,
          }
        : {
            day,
            enabled: false,
          },
    );
  }

  return response;
}

export async function updateWeeklySchedule(input: WeeklyScheduleInput) {
  const { locationId, rules } = input;
  return updateTargetWeeklySchedule({
    targetType: WORK_RULE_TYPE,
    targetId: locationId,
    rules,
  });
}

export async function updateEmployeeWeeklySchedule(
  input: EmployeeWeeklyScheduleInput,
) {
  const { locationEmployeeId, rules } = input;

  return updateTargetWeeklySchedule({
    targetType: EMPLOYEE_RULE_TYPE,
    targetId: locationEmployeeId,
    rules,
  });
}

export async function getWeeklySchedule(locationId: string): Promise<WeeklyScheduleView[]> {
  return getWeeklyScheduleByTarget({
    targetType: WORK_RULE_TYPE,
    targetId: locationId,
  });
}

export async function getEmployeeWeeklySchedule(
  locationEmployeeId: string,
  locationId: string,
): Promise<WeeklyScheduleView[]> {
  const [locationSchedule, employeeSchedule] = await Promise.all([
    getWeeklyScheduleByTarget({
      targetType: WORK_RULE_TYPE,
      targetId: locationId,
    }),
    getWeeklyScheduleByTarget({
      targetType: EMPLOYEE_RULE_TYPE,
      targetId: locationEmployeeId,
    }),
  ]);

  const employeeByDay = new Map(employeeSchedule.map((day) => [day.day, day]));

  return locationSchedule.map((locationDay) =>
    employeeByDay.get(locationDay.day) ?? locationDay,
  );
}

export async function getRecurringBreaksByTarget({
  targetType,
  targetId,
}: {
  targetType: ScheduleTargetType;
  targetId: string;
}): Promise<RecurringBreakView[]> {
  const rules = await prisma.scheduleRule.findMany({
    where: {
      targetType,
      targetId,
      isBreak: true,
    },
    orderBy: [{ daysMask: "asc" }, { startMinute: "asc" }],
    select: {
      id: true,
      daysMask: true,
      startMinute: true,
      endMinute: true,
    },
  });

  return sortRecurringBreaks(
    rules.map((rule) => ({
      id: rule.id,
      day: Math.log2(rule.daysMask),
      startMinute: rule.startMinute,
      endMinute: rule.endMinute,
    })),
  );
}

export async function getLocationRecurringBreaks(locationId: string) {
  return getRecurringBreaksByTarget({
    targetType: WORK_RULE_TYPE,
    targetId: locationId,
  });
}

export async function getEmployeeRecurringBreaks(locationEmployeeId: string) {
  return getRecurringBreaksByTarget({
    targetType: EMPLOYEE_RULE_TYPE,
    targetId: locationEmployeeId,
  });
}

export async function replaceRecurringBreaksByTarget({
  targetType,
  targetId,
  rules,
}: {
  targetType: ScheduleTargetType;
  targetId: string;
  rules: Array<Pick<RecurringBreakView, "day" | "startMinute" | "endMinute">>;
}) {
  const sortedRules = sortRecurringBreaks(rules);

  return prisma.$transaction(async (tx) => {
    await tx.scheduleRule.deleteMany({
      where: {
        targetType,
        targetId,
        isBreak: true,
      },
    });

    if (sortedRules.length === 0) {
      return { status: "ok" };
    }

    await tx.scheduleRule.createMany({
      data: sortedRules.map((rule) => ({
        targetType,
        targetId,
        daysMask: dayToMask(rule.day),
        startMinute: rule.startMinute,
        endMinute: rule.endMinute,
        isBreak: true,
      })),
    });

    return { status: "ok" };
  });
}
