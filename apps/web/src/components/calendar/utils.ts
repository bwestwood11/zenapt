import { SLOT_MINUTES } from "./constants";
import type { LocationHours } from "./types";

export type TimeFormat =
  | "24h"
  | "12h"
  | "12h:min"
  | "12h:min:period"
  | "24h:min";

export const formatMinutes = (
  minutes: number,
  format: TimeFormat = "12h:min:period",
) => {
  const hour24 = Math.floor(minutes / 60);
  const min = minutes % 60;

  const hour12 = hour24 % 12 || 12;
  const period = hour24 < 12 ? "AM" : "PM";
  const isHour = min === 0;

  let value: string;

  switch (format) {
    case "24h":
      value = `${hour24}`;
      break;

    case "24h:min":
      value = `${hour24}:${min.toString().padStart(2, "0")}`;
      break;

    case "12h":
      value = `${hour12}`;
      break;

    case "12h:min":
      value = `${hour12}:${min.toString().padStart(2, "0")}`;
      break;

    case "12h:min:period":
    default:
      value = `${hour12}:${min.toString().padStart(2, "0")} ${period}`;
  }

  return {
    formattedTime: value,
    hour12,
    hour24,
    minutes: min,
    period,
    isHour,
  };
};

export const minuteToRow = (minute: number, location: LocationHours) => {
  const clamped = clamp(minute, location.start, location.end);
  return Math.floor((clamped - location.start) / SLOT_MINUTES) + 1;
};

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

export function minutesTo12Hour(minutes: number): string {
  if (minutes < 0 || minutes >= 1440) {
    throw new Error("Minutes must be between 0 and 1439");
  }

  const hrs24 = Math.floor(minutes / 60);
  const mins = minutes % 60;

  const period = hrs24 >= 12 ? "PM" : "AM";
  const hrs12 = hrs24 % 12 || 12;

  return `${hrs12}:${mins.toString().padStart(2, "0")} ${period}`;
}

export function minutesTo24Hour(minutes: number): string {
  if (minutes < 0 || minutes >= 1440) {
    throw new Error("Minutes must be between 0 and 1439");
  }

  const hrs24 = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hrs24}:${mins.toString().padStart(2, "0")}`;
}

export function time24HourToMinutes(value: string): number {
  const match = value.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/)

  if (!match) {
    throw new Error("Invalid time format. Expected HH:mm (24-hour)")
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])

  return hours * 60 + minutes
}


export function time12HourToMinutes(value: string): number {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);

  if (!match) {
    throw new Error("Invalid time format. Expected hh:mm AM/PM");
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
    throw new Error("Invalid time value");
  }

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function getColorFromEmployeeName(name: string): string {
  let hash = 0;

  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360; // 0–359
  const saturation = 65; // %
  const lightness = 55; // %

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
