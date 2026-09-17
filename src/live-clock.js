import { REDUCED_MOTION } from "./config.js";
import { nowInTimeZone } from "./lib/time.js";

/**
 * One shared ticker for everything that animates with the wall clock
 * (map light markers, the cycle clock in the panel).
 * Runs once per frame, or once per second with reduced motion.
 */

const tickers = new Set();

/** Register a `({ secondsOfDay, dayType }) => void` callback; returns an unsubscribe function. */
export function onTick(fn) {
  tickers.add(fn);
  return () => tickers.delete(fn);
}

function tick() {
  const now = nowInTimeZone();
  for (const fn of tickers) fn(now);
  if (REDUCED_MOTION) setTimeout(tick, 1000);
  else requestAnimationFrame(tick);
}

export const startLiveClock = () => tick();
