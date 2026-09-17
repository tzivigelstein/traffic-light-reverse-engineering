import { cyclePosition, parseClockTime } from "../lib/time.js";
import { dataset } from "./dataset.js";
import { bandFor, bandKey, withinBands } from "./time-bands.js";

const STATUS_RANK = ["observing", "probable", "confirmed"];
export const statusRank = (status) => STATUS_RANK.indexOf(status);

/** Best status across a crossing's time-band models. */
export function crossingStatus(crossing) {
  return crossing.models.reduce((best, m) => (statusRank(m.status) > statusRank(best) ? m.status : best), "observing");
}

/** Fewest waits still needed by any band, or null when no band is close. */
export function missingWaits(crossing) {
  const missing = crossing.models.map((m) => m.missing).filter(Boolean);
  return missing.length ? Math.min(...missing) : null;
}

/** The model with the most waits (for the list progress bar). */
export const bestModel = (crossing) =>
  crossing.models.reduce((best, m) => (m.waits > (best?.waits ?? -1) ? m : best), null);

/**
 * @typedef {Object} LiveModel  A cycle good enough to drive a clock.
 * @property {import("./types.js").CrossingModel} model
 * @property {number} cycle
 * @property {number} phase
 * @property {number} greenMax
 * @property {boolean} provisional
 */

/**
 * Best model for showing a live clock: a confirmed/probable one, else a provisional fit
 * with enough aligned waits. Null when nothing usable exists.
 * @returns {LiveModel|null}
 */
export function liveModel(crossing) {
  const byWaits = (a, b) => b.waits - a.waits;
  const confirmed = crossing.models.filter((m) => m.status !== "observing" && m.cycle).sort(byWaits)[0];
  if (confirmed) {
    return { model: confirmed, cycle: confirmed.cycle, phase: confirmed.phase, greenMax: confirmed.greenMax, provisional: false };
  }
  const fit = crossing.models.filter((m) => m.provisional && m.waits >= 8 && m.provisional.aligned >= 0.6).sort(byWaits)[0];
  if (fit) {
    const p = fit.provisional;
    return { model: fit, cycle: p.cycle, phase: p.phase, greenMax: p.greenMax, provisional: true };
  }
  return null;
}

/** Safe-green end and uncertain-green end, in seconds from the start of the green. */
export function cyclePhases({ cycle, greenMax }) {
  return {
    greenMin: Math.max(5, greenMax - 10),
    greenMax: Math.min(cycle - 5, greenMax + 4),
  };
}

/**
 * Classify a pass against a live model.
 * @returns {[category: "green"|"waitedGreen"|"crossedRed"|"waitedGap", position: number]}
 */
export function classifyPass(pass, live) {
  const position = cyclePosition(parseClockTime(pass.time), live.cycle, live.phase);
  if (pass.wait > 0) {
    const distanceToGreen = Math.min(position, live.cycle - position);
    return [distanceToGreen <= 4 ? "waitedGreen" : "waitedGap", position];
  }
  const signed = position > live.cycle - 12 ? position - live.cycle : position;
  return [signed <= live.greenMax + 2 ? "green" : "crossedRed", position];
}

/**
 * Every pass through the crossing that falls inside the live model's bands,
 * classified, plus counts per month.
 */
export function classifiedPasses(crossing, live) {
  const bands = live.model.includes.map(([dayType, band]) => `${dayType}|${band}`);
  const passes = [];
  const byMonth = {};
  for (const walk of dataset.walks) {
    const dayType = walk.weekday < 5 ? "weekday" : "weekend";
    for (const pass of walk.crossings) {
      if (pass.crossingId !== crossing.id) continue;
      if (!bands.includes(bandFor(dayType, parseClockTime(pass.time)))) continue;
      const [category, position] = classifyPass(pass, live);
      passes.push({ category, position, fixedPrecision: walk.fixedPrecision });
      const month = walk.date.slice(0, 7);
      byMonth[month] ??= { green: 0, waitedGreen: 0, crossedRed: 0, waitedGap: 0 };
      byMonth[month][category]++;
    }
  }
  return { passes, byMonth };
}

/** First green start at or after 08:00, as seconds since midnight. */
export function firstGreenAfter(live, baseSeconds = 8 * 3600) {
  const position = cyclePosition(baseSeconds, live.cycle, live.phase);
  return baseSeconds + ((live.cycle - position) % live.cycle);
}

export { withinBands, bandKey };
