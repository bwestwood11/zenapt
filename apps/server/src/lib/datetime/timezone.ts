type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();
const weekdayFormatters = new Map<string, Intl.DateTimeFormat>();

function getDateTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = dateTimeFormatters.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    dateTimeFormatters.set(timeZone, formatter);
  }

  return formatter;
}

function getWeekdayFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = weekdayFormatters.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
    });
    weekdayFormatters.set(timeZone, formatter);
  }

  return formatter;
}

const weekdayToIndex: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
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

export function getMinutesInTimeZone(date: Date, timeZone: string): number {
  const { hour, minute } = getZonedDateParts(date, timeZone);
  return hour * 60 + minute;
}

export function getMonthDayInTimeZone(date: Date, timeZone: string): string {
  const { month, day } = getZonedDateParts(date, timeZone);
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getDayBitInTimeZone(date: Date, timeZone: string): number {
  const weekday = getWeekdayFormatter(timeZone).format(date);
  return 1 << weekdayToIndex[weekday];
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

export function zonedDateTimeToUtc(
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

export function getZonedDayRangeUtc(date: Date, timeZone: string): {
  dayStartUtc: Date;
  dayEndUtc: Date;
  year: number;
  month: number;
  day: number;
} {
  const { year, month, day } = getZonedDateParts(date, timeZone);
  const dayStartUtc = zonedDateTimeToUtc(timeZone, {
    year,
    month,
    day,
    hour: 0,
    minute: 0,
    second: 0,
  });

  const nextDayUtcRef = new Date(Date.UTC(year, month - 1, day + 1));
  const nextYear = nextDayUtcRef.getUTCFullYear();
  const nextMonth = nextDayUtcRef.getUTCMonth() + 1;
  const nextDay = nextDayUtcRef.getUTCDate();

  const dayEndUtc = zonedDateTimeToUtc(timeZone, {
    year: nextYear,
    month: nextMonth,
    day: nextDay,
    hour: 0,
    minute: 0,
    second: 0,
  });

  return {
    dayStartUtc,
    dayEndUtc,
    year,
    month,
    day,
  };
}

export function dateAtMinutesInTimeZone(
  date: Date,
  minutesSinceMidnight: number,
  timeZone: string,
): Date {
  const { year, month, day } = getZonedDateParts(date, timeZone);
  const hour = Math.floor(minutesSinceMidnight / 60);
  const minute = minutesSinceMidnight % 60;

  return zonedDateTimeToUtc(timeZone, {
    year,
    month,
    day,
    hour,
    minute,
    second: 0,
  });
}

export function getDateKeyInTimeZone(date: Date, timeZone: string): string {
  const { year, month, day } = getZonedDateParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}