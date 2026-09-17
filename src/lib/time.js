import { TIME_ZONE } from "../config.js";

export const SECONDS_PER_DAY = 86400;

/** "HH:MM:SS" -> seconds since midnight. */
export function parseClockTime(text) {
  const [h, m, s] = text.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

/** Seconds since midnight, wrapped into [0, 86400). */
export const wrapDay = (seconds) => ((Math.round(seconds) % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY;

/** Position of `seconds` within a repeating cycle that starts at `phase`. */
export const cyclePosition = (seconds, cycle, phase) => (((seconds - phase) % cycle) + cycle) % cycle;

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short", hour12: false,
});

/** Current wall-clock time in the configured time zone. */
export function nowInTimeZone(date = new Date()) {
  const p = Object.fromEntries(partsFormatter.formatToParts(date).map((x) => [x.type, x.value]));
  const secondsOfDay = (+p.hour % 24) * 3600 + +p.minute * 60 + +p.second + date.getMilliseconds() / 1000;
  const dayType = ["Sat", "Sun"].includes(p.weekday) ? "weekend" : "weekday";
  return { secondsOfDay, dayType };
}
