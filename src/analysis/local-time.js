import { TIME_BANDS } from "../model/time-bands.js";
import { TZ_OFFSET } from "./constants.js";
import { mod } from "./numeric.js";

/** Unix seconds -> seconds since local midnight. */
export const localSeconds = (ts) => mod(ts + TZ_OFFSET, 86400);

const localDate = (ts) => new Date((ts + TZ_OFFSET) * 1000);

/** 0 = Monday … 6 = Sunday, in local time. */
export const localWeekday = (ts) => (localDate(ts).getUTCDay() + 6) % 7;

export const dayTypeOf = (ts) => (localWeekday(ts) >= 5 ? "weekend" : "weekday");

/** "YYYY-MM-DD" in local time. */
export const localIsoDate = (ts) => localDate(ts).toISOString().slice(0, 10);

/** "YYYY-MM" in local time. */
export const localIsoMonth = (ts) => localIsoDate(ts).slice(0, 7);

/** Hour band ("7–10") a time of day falls in, or "?" past the table. */
export function bandOf(secondsOfDay, dayType) {
  const hour = secondsOfDay / 3600;
  const band = TIME_BANDS[dayType].find(([from, to]) => hour >= from && hour < to);
  return band ? `${band[0]}–${band[1]}` : "?";
}

export const bandIndex = (dayType, band) =>
  TIME_BANDS[dayType].findIndex(([from, to]) => `${from}–${to}` === band);

/** "HH:MM:SS" from seconds of day. */
export function formatClock(secondsOfDay) {
  const s = mod(Math.round(secondsOfDay), 86400);
  const pad = (v) => String(v).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}
