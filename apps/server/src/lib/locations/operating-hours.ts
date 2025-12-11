import prisma from "../../../prisma";
import { ScheduleTargetType } from "../../../prisma/generated/enums";

const WORK_RULE_TYPE = ScheduleTargetType.LOCATION; // adjust if enum requires uppercase

type WeeklyScheduleView = {
  day: number // 0 = Mon ... 6 = Sun
  enabled: boolean
  startMinute?: number
  endMinute?: number
}

type WeeklyScheduleInput = {
  locationId: string;
  rules: WeeklyScheduleView[];
};

export async function updateWeeklySchedule(input: WeeklyScheduleInput) {
  const { locationId, rules } = input;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.scheduleRule.findMany({
      where: {
        targetType: WORK_RULE_TYPE,
        targetId: locationId,
        isBreak: false,
      },
    });

    const dayToMask = (day: number) => 1 << day;

    for (const rule of rules) {
      const mask = dayToMask(rule.day);
      const existingRecord = existing.find((r) => r.daysMask === mask);

      // if disabled → delete if exists
      if (!rule.enabled) {
        if (existingRecord) {
          await tx.scheduleRule.delete({
            where: { id: existingRecord.id },
          });
        }
        continue;
      }

      if (!rule.startMinute || !rule.endMinute) {
        throw new Error(`Missing time range for enabled weekday: ${rule.day}`);
      }

      // if exists → update
      if (existingRecord) {
        await tx.scheduleRule.update({
          where: { id: existingRecord.id },
          data: {
            startMinute: rule.startMinute,
            endMinute: rule.endMinute,
          },
        });
      } else {
        // else → insert
        await tx.scheduleRule.create({
          data: {
            targetType: WORK_RULE_TYPE,
            targetId: locationId,
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


export async function getWeeklySchedule(locationId: string): Promise<WeeklyScheduleView[]> {

  // Fetch all work hour rules (not breaks)
  const rules = await prisma.scheduleRule.findMany({
    where: {
      targetType: WORK_RULE_TYPE,
      targetId: locationId,
      isBreak: false
    }
  });

  // Pre-map rows by bitmask for fast lookup
  const map = new Map<number, { startMinute: number; endMinute: number }>();

  for (const r of rules) {
    map.set(r.daysMask, {
      startMinute: r.startMinute,
      endMinute: r.endMinute
    });
  }

  const dayToMask = (day: number) => 1 << day;

  // Build UI format for all 7 days
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
            endMinute: entry.endMinute
          }
        : {
            day,
            enabled: false
          }
    );
  }

  return response;
}
