export const getLocalTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;

export const formatDateInTimeZone = (date: Date, timeZone: string) => {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export const formatShortDateTimeInTimeZone = (date: Date, timeZone: string) => {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const formatTimeInTimeZone = (date: Date, timeZone: string) => {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const formatTimeRangeInTimeZone = (
  start: Date,
  end: Date,
  timeZone: string,
) => {
  return `${formatTimeInTimeZone(start, timeZone)} - ${formatTimeInTimeZone(end, timeZone)}`;
};

export const shouldShowLocationTime = (
  start: Date,
  end: Date,
  localTimeZone: string,
  locationTimeZone: string,
) => {
  if (localTimeZone === locationTimeZone) return false;

  const localDate = formatDateInTimeZone(start, localTimeZone);
  const locationDate = formatDateInTimeZone(start, locationTimeZone);
  const localRange = formatTimeRangeInTimeZone(start, end, localTimeZone);
  const locationRange = formatTimeRangeInTimeZone(start, end, locationTimeZone);

  return localDate !== locationDate || localRange !== locationRange;
};
