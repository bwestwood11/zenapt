type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getDateTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const parts = getDateTimeFormatter(timeZone).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number.parseInt(part.value, 10)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getTimeZoneOffsetMinutes(timeZone: string, utcDate: Date): number {
  const zoned = getZonedDateParts(utcDate, timeZone);
  const asUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );

  return (asUtc - utcDate.getTime()) / 60_000;
}

function zonedDateTimeToUtc(
  timeZone: string,
  input: {
    year: number;
    month: number;
    day: number;
    hour?: number;
    minute?: number;
    second?: number;
  },
): Date {
  const {
    year,
    month,
    day,
    hour = 0,
    minute = 0,
    second = 0,
  } = input;

  const targetUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let timestamp = targetUtc;

  for (let iteration = 0; iteration < 4; iteration++) {
    const offset = getTimeZoneOffsetMinutes(timeZone, new Date(timestamp));
    const next = targetUtc - offset * 60_000;

    if (next === timestamp) break;
    timestamp = next;
  }

  return new Date(timestamp);
}

export function parseDateKey(dateKey: string) {
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

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return dateKey;

  const dateUtc = new Date(
    Date.UTC(parsed.year, parsed.month - 1, parsed.day + deltaDays),
  );

  return `${dateUtc.getUTCFullYear()}-${String(dateUtc.getUTCMonth() + 1).padStart(2, "0")}-${String(dateUtc.getUTCDate()).padStart(2, "0")}`;
}

export function getDateKeyInTimeZone(date: Date, timeZone: string): string {
  const { year, month, day } = getZonedDateParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function dateToMinutesInTimeZone(date: Date, timeZone: string): number {
  const { hour, minute } = getZonedDateParts(date, timeZone);
  return hour * 60 + minute;
}

export function dateKeyToDateInTimeZone(
  dateKey: string,
  timeZone: string,
  hour = 12,
): Date {
  const parsed = parseDateKey(dateKey);

  if (!parsed) {
    return new Date();
  }

  return zonedDateTimeToUtc(timeZone, {
    year: parsed.year,
    month: parsed.month,
    day: parsed.day,
    hour,
    minute: 0,
    second: 0,
  });
}

export function dateFromDayMinutesInTimeZone(
  dateKey: string,
  minutesFromStartOfDay: number,
  timeZone: string,
): Date {
  const parsed = parseDateKey(dateKey);

  if (!parsed) {
    return new Date();
  }

  const hour = Math.floor(minutesFromStartOfDay / 60);
  const minute = minutesFromStartOfDay % 60;

  return zonedDateTimeToUtc(timeZone, {
    year: parsed.year,
    month: parsed.month,
    day: parsed.day,
    hour,
    minute,
    second: 0,
  });
}
