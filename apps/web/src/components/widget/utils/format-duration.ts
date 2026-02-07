export const formatDuration = (totalMinutes: number): string => {
  if (!Number.isFinite(totalMinutes)) return "0 min";

  const minutes = Math.max(0, Math.round(totalMinutes));

  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "min" : "mins"}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  const hourLabel = hours === 1 ? "hour" : "hours";

  if (remainingMinutes === 0) {
    return `${hours} ${hourLabel}`;
  }

  const minuteLabel = remainingMinutes === 1 ? "min" : "mins";
  return `${hours} ${hourLabel} ${remainingMinutes} ${minuteLabel}`;
};
