import { createRng, mean, min, mod } from "./numeric.js";

/**
 * For every departure second simulate K walks with your pace variation. At crossings
 * with a pattern apply the model; at those without, draw a wait from what happened to
 * you there. A wait delays everything after it.
 *
 * @param {{delta: number, model?: object, samples?: number[]}[]} items  Crossings along the route
 * @returns {{ best: number, average: number, windows: [number, number][] }}  Seconds of day
 */
export function recommend(items, from, to, margin, paceSd, K = 96) {
  const rng = createRng(0);
  const departures = [];
  for (let s = Math.floor(from); s <= Math.floor(to); s++) departures.push(s);
  const eps = Array.from({ length: K }, () => rng.normal(paceSd));
  const delayed = departures.map(() => new Float64Array(K));
  for (const item of [...items].sort((a, b) => a.delta - b.delta)) {
    const m = item.model;
    const sample = m ? null : Array.from({ length: K }, () => rng.choice(item.samples));
    departures.forEach((s, si) => {
      const row = delayed[si];
      for (let k = 0; k < K; k++) {
        if (m) {
          const arrival = s + item.delta * (1 + eps[k]) + row[k];
          const rel = mod(arrival - m.phase, m.C);
          const greenEnd = Math.max(m.green, m.greenMax * 0.6) - margin;
          row[k] += rel > greenEnd ? m.C - rel : 0;
        } else {
          row[k] += sample[k];
        }
      }
    });
  }
  const expected = delayed.map((row) => mean(Array.from(row)));
  const best = min(expected);
  const windows = [];
  let current = null;
  departures.forEach((s, i) => {
    if (expected[i] > best + 1) return;
    if (current && s === current[1] + 1) current[1] = s;
    else { current = [s, s]; windows.push(current); }
  });
  windows.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));   // widest (most tolerant) first
  return { best, average: mean(expected), windows };
}
