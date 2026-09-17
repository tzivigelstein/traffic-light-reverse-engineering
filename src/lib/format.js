import { locale } from "../i18n/es.js";
import { wrapDay } from "./time.js";

const pad2 = (v) => String(v).padStart(2, "0");

/** Seconds since midnight -> "HH:MM:SS". */
export function formatTime(seconds) {
  const s = wrapDay(seconds);
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(pad2).join(":");
}

/** Seconds since midnight -> "HH:MM". */
export const formatHm = (seconds) => formatTime(seconds).slice(0, 5);

/** Number -> localized decimal string (no unit). */
export const formatDecimal = (value, digits) =>
  (digits == null ? String(value) : value.toFixed(digits)).replace(".", locale.decimalSeparator);

/** Kilometres without unit: 2 decimals under 10 km, 1 above. */
export const formatKmNumber = (km) => formatDecimal(km, km < 10 ? 2 : 1);

/** Kilometres with unit. */
export const formatKm = (km) => `${formatKmNumber(km)} ${locale.units.km}`;

/** Seconds -> whole minutes with unit. */
export const formatMinutes = (seconds) => `${Math.round(seconds / 60)} ${locale.units.min}`;

/** Seconds -> "1 min 40 s". */
export function formatMinutesSeconds(seconds) {
  const whole = Math.round(seconds);
  return locale.minutesSeconds(Math.floor(whole / 60), whole % 60);
}

/** Metres -> "250 m" / "1 km" for the scale bar. */
export const formatDistance = (metres) =>
  metres >= 1000 ? `${metres / 1000} ${locale.units.km}` : `${metres} ${locale.units.m}`;

/** "2026-02-08" -> "domingo 8 de febrero". */
export function formatLongDate(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7; // Monday = 0
  return locale.longDate(locale.weekdays[weekday], d, locale.months[m - 1]);
}

/** "2026-02" -> "feb". */
export const formatMonthShort = (isoMonth) => locale.monthsShort[+isoMonth.slice(5, 7) - 1];
