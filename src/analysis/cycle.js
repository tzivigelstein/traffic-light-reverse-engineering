import { CYCLES, MIN_WAIT } from "./constants.js";
import { localSeconds } from "./local-time.js";
import { argmax, binomialTail, clip, comb, max, mean, median, min, mod, roundHalfEven, sum } from "./numeric.js";

/**
 * Cycle fitting for one crossing and time band.
 *
 * A "place data" bundle summarises the passes of one band (see events.js):
 * @typedef {Object} PlaceData
 * @property {number[]} te   Seconds of day when you were released after waiting
 * @property {number[]} ts   Seconds of day when you arrived and started waiting
 * @property {number[]} tp   Seconds of day of passes without waiting
 * @property {number[]} dur  Wait durations
 * @property {number[]} w    Weight of each wait (inferred waits weigh less)
 * @property {number} maxWait
 * @property {number} n      All passes
 *
 * @typedef {Object} CycleFit
 * @property {number} C
 * @property {number} phase        Seconds of day (mod C) when the release happens
 * @property {number} score        Log-likelihood ratio against "no pattern"
 * @property {number} greenMax
 * @property {number} q            Probability of not waiting for the green when arriving on red
 * @property {number} aligned      Fraction of waits released within ±4 s of the phase
 * @property {number} passFraction
 * @property {number} greenMin
 * @property {number[]} [alternatives]
 */

const circ = (x, C) => Math.abs(mod(x + C / 2, C) - C / 2);

/**
 * Best release phase for a cycle length C.
 *
 * Model: you arrive at a random moment of the cycle. On green you pass. On red, with
 * probability q you do not wait for the green (you cross when no cars come, maybe after
 * waiting for a gap) and with 1-q you wait until it turns green. q is estimated from the
 * data for each phase, so crossing on red is not evidence against the light. The score is
 * the log-likelihood ratio against "there is no pattern".
 */
export function fit(d, C, phaseStep = 0.5) {
  if (d.maxWait > C - 5) return null;
  const phases = [];
  for (let p = 0; p < C; p += phaseStep) phases.push(p);
  const nPhases = phases.length;
  const a = new Float64Array(nPhases), b = new Float64Array(nPhases), sumK = new Float64Array(nPhases);
  const greenHi = new Float64Array(nPhases).fill(C * 0.6);
  const nWaits = d.te.length;
  const logNorm = -Math.log(2 * Math.sqrt(2 * Math.PI)) + Math.log(C);
  if (nWaits) {
    const totalW = sum(d.w);
    const aligned = [];
    for (let j = 0; j < nPhases; j++) {
      const phi = phases[j];
      aligned.length = 0;
      let aj = 0, kj = 0;
      for (let i = 0; i < nWaits; i++) {
        const dif = circ(d.te[i] - phi, C);
        if (dif <= 4) {                                  // waited for the green
          aj += d.w[i];
          kj += (-0.5 * (dif / 2) ** 2 + logNorm) * d.w[i];
          aligned.push(mod(d.ts[i] - phi, C));
        }
      }
      a[j] = aj; b[j] = totalW - aj; sumK[j] = kj;       // b: waited for a gap
      if (aligned.length) {
        aligned.sort((x, y) => x - y);
        const idx = Math.max(Math.floor(0.1 * (aligned.length - 1)), 0);
        greenHi[j] = clip(aligned[idx], 5, C - 5);
      }
    }
  }
  const nRed = new Float64Array(nPhases);
  for (let j = 0; j < nPhases; j++) {
    const phi = phases[j];
    let count = 0;
    for (const tp of d.tp) {
      const rel = mod(tp - phi + 3, C) - 3;
      if (!(rel <= greenHi[j] + 2 || rel >= C - MIN_WAIT - 6)) count++;   // crossed on red
    }
    nRed[j] = count;
  }
  const score = new Float64Array(nPhases), q = new Float64Array(nPhases);
  for (let j = 0; j < nPhases; j++) {
    q[j] = clip((nRed[j] + b[j]) / Math.max(nRed[j] + b[j] + a[j], 1), 0.02, 0.98);
    // a gap wait lasts the same with or without a light: it only contributes log q
    score[j] = sumK[j] + a[j] * Math.log(1 - q[j]) + b[j] * Math.log(q[j]) + nRed[j] * Math.log(q[j]);
  }
  const i = argmax(score), phi = phases[i];
  const res = { C, phase: phi, score: score[i], greenMax: greenHi[i], q: q[i], aligned: NaN };
  if (nWaits) {
    let hit = 0, tw = 0;
    for (let k = 0; k < nWaits; k++) { if (circ(d.te[k] - phi, C) <= 4) hit += d.w[k]; tw += d.w[k]; }
    res.aligned = hit / tw;
  }
  if (d.tp.length) {
    const rp = d.tp.map((tp) => mod(tp - phi + 3, C) - 3);
    const ok = rp.map((r) => r <= greenHi[i] + 2 || r >= C - MIN_WAIT - 6);
    res.passFraction = mean(ok.map(Number));
    const inside = rp.filter((r) => r <= greenHi[i] + 2);
    res.greenMin = inside.length ? Math.max(max(inside) + 1, 5) : 5;
  } else {
    res.passFraction = NaN;
    res.greenMin = 5;
  }
  return res;
}

/** Best cycle among the candidates; ties within 0.05 go to the longest cycle. */
export function searchCycle(d, cycles = CYCLES) {
  if (d.n < 5 || d.te.length < 2) return null;
  const fits = cycles.map((C) => fit(d, C)).filter(Boolean);
  if (!fits.length) return null;
  const top = max(fits.map((f) => f.score));
  const best = fits.filter((f) => f.score >= top - 0.05).reduce((x, y) => (y.C > x.C ? y : x));
  const alternatives = [];
  for (const f of [...fits].sort((x, y) => y.score - x.score)) {
    if (f.score > 0.8 * top && [...alternatives, best.C].every((c) => Math.abs(f.C - c) > 2)) alternatives.push(f.C);
    if (alternatives.length === 2) break;
  }
  best.alternatives = alternatives;
  return best;
}

/** Probability that this many waits line up by chance (binomial, corrected for trying every phase). */
export function chanceProbability(m, d, window = 8) {
  const nW = sum(d.w), n = roundHalfEven(nW);
  if (n === 0 || Number.isNaN(m.aligned)) return 1;
  const a = roundHalfEven(m.aligned * nW);
  const q = Math.min(1, window / m.C);
  return Math.min(1, binomialTail(n, a, q) * m.C / 4);
}

/**
 * At a real light or platoon the moment you get released is very precise. If it is you who
 * always arrives in the same phase (synchronised by the previous light) and the wait is
 * random, releases scatter.
 */
export function sharpRelease(m, d, limit = 4.5) {
  const C = m.C;
  const dev = d.te.map((te) => mod(te - m.phase + C / 2, C) - C / 2);
  const sel = dev.map((v) => Math.abs(v) <= 15);
  const count = sel.filter(Boolean).length;
  if (count < 3) return false;
  // most releases must fall within ±4 s, not just a small cluster
  const within = dev.filter((v, i) => sel[i]).map((v) => Number(Math.abs(v) <= 4));
  if (mean(within) < (count >= 12 ? 0.75 : 0.55)) return false;
  const x = d.te.filter((_, i) => sel[i]);
  let re = 0, im = 0;
  for (const v of x) { re += Math.cos(2 * Math.PI * v / C); im += Math.sin(2 * Math.PI * v / C); }
  const centre = Math.atan2(im / x.length, re / x.length) * C / (2 * Math.PI);
  const devs = x.map((v) => mod(v - centre + C / 2, C) - C / 2);
  const md = median(devs);
  return 1.4826 * median(devs.map((v) => Math.abs(v - md))) <= limit;
}

/**
 * "Different" cycles tried between 40 and 180 s: with data spanning R seconds, changing the
 * cycle by ~8·C/R already moves the releases out of the ±4 s window. Integrated: (R/8)·ln(180/40).
 */
export function independentCount(d) {
  const hours = [...d.te, ...d.tp];
  const range = hours.length ? max(hours) - min(hours) : 0;
  return Math.max(1, (range / 8) * Math.log(CYCLES[CYCLES.length - 1] / CYCLES[0]));
}

/** A pattern found by searching every cycle: demanding threshold. */
export function isReliable(m, d) {
  return chanceProbability(m, d) * independentCount(d) < 1e-3 && d.n >= 6 && m.score > 0 && sharpRelease(m, d);
}

/** @returns {"confirmed"|"probable"|"observing"} */
export function modelStatus(m, d, knownCycle = false) {
  if (!m || !d.te.length || m.score <= 0) return "observing";
  if (isReliable(m, d)) return "confirmed";
  const p = chanceProbability(m, d), sharp = sharpRelease(m, d);
  if (knownCycle) {
    if (p < 0.01 && sharp) return "confirmed";
    if (p < 0.05 && sharp) return "probable";
  } else if (p * independentCount(d) < 0.01 && sharp && sum(d.w) >= 5) {
    return "probable";
  }
  return "observing";
}

/** How many more waits, at the current alignment rate, would confirm the pattern. */
export function missingWaits(m, d) {
  const n0 = d.te.length ? roundHalfEven(sum(d.w)) : 0;
  const aligned = m && !Number.isNaN(m.aligned) ? m.aligned : null;
  if (n0 >= 12 && (aligned == null || aligned < 0.6)) return null;   // data exists and does not line up
  const rate = aligned && aligned > 0.5 ? aligned : 0.75;
  const C = m ? m.C : 100;
  const ni = d.te.length + d.tp.length > 1 ? independentCount(d) : 20;
  const q = Math.min(1, 8 / C);
  for (let n = Math.max(n0, 3); n < 80; n++) {
    const a = roundHalfEven(rate * n);
    if ((binomialTail(n, a, q) * C / 4) * ni < 1e-3) return Math.max(n - n0, 1);
  }
  return null;
}

/** Common cycle of several confirmed crossings (coordinated lights). */
export function jointCycle(datas, keys) {
  const totals = [];
  for (const C of CYCLES) {
    const fits = keys.map((k) => fit(datas[k], C, 1.0));
    if (fits.every(Boolean)) totals.push([sum(fits.map((f) => f.score)), C]);
  }
  if (!totals.length) return [null, 0];
  const top = max(totals.map((t) => t[0]));
  const C0 = max(totals.filter(([s]) => s >= top - 0.1).map(([, C]) => C));
  const fine = [];
  for (let C = C0 - 1; C <= C0 + 1.005; C += 0.05) {
    const fits = keys.map((k) => fit(datas[k], C));
    if (fits.every(Boolean)) fine.push([sum(fits.map((f) => f.score)), C]);
  }
  const sMax = max(fine.map((t) => t[0]));
  const C1 = Math.round(median(fine.filter(([s]) => s >= sMax - 0.15).map(([, C]) => C)) / 0.05) * 0.05;
  const fits = keys.map((k) => fit(datas[k], C1));
  const aligned = fits.map((f) => f.aligned).filter((v) => !Number.isNaN(v));
  return [C1, aligned.length ? mean(aligned) : NaN];
}

/** Did the pattern stop holding at some point? (Fisher exact test, corrected for the cuts tried.) */
export function planChange(events, m, lastTs) {
  const waits = events.filter((e) => e.wait).sort((a, b) => a.release - b.release);
  if (waits.length < 12) return null;
  const C = m.C;
  const ok = waits.map((e) => Math.abs(mod(localSeconds(e.release) - m.phase + C / 2, C) - C / 2) <= 4);
  const N = ok.length, K = ok.filter(Boolean).length;
  let best = null;
  const cuts = N - 5 - 6;
  for (let i = 6; i < N - 5; i++) {
    const k1 = ok.slice(0, i).filter(Boolean).length;
    const before = k1 / i, after = (K - k1) / (N - i);
    if (before >= 0.6 && after <= 0.3) {
      let pv = 0;
      for (let x = k1; x <= Math.min(K, i); x++) pv += comb(K, x) * comb(N - K, i - x);
      pv /= comb(N, i);
      if (!best || pv < best.pv) best = { pv, i, before, after };
    }
  }
  if (best && best.pv * Math.max(cuts, 1) < 0.01) {
    const at = waits[best.i].release;
    return { date: at, before: best.before, after: best.after, days: (lastTs - at) / 86400 };
  }
  return null;
}

/** Platoon/red-phase duration estimates from the waits that match the pattern. */
export function platoonStats(d, C, phase = null) {
  const nWaits = d.dur.length;
  let p = d.n ? nWaits / d.n : 0;
  let dur = d.dur;
  const estimates = {};
  if (C && phase != null && nWaits) {
    // only the waits that fit the pattern (drops stray cars)
    dur = d.dur.filter((_, i) => Math.abs(mod(d.te[i] - phase + C / 2, C) - C / 2) <= 4);
    p = dur.length / d.n;
  }
  if (dur.length >= 3) {
    estimates.longestWait = percentile90(dur);
    estimates.twiceMeanWait = 2 * mean(dur);
  }
  if (C && p > 0 && p < 1) estimates.probabilityTimesCycle = p * C;
  const values = Object.values(estimates);
  return {
    p,
    meanWait: nWaits ? mean(d.dur) : 0,
    delayPerPass: d.n ? sum(d.dur) / d.n : 0,
    duration: values.length ? median(values) : NaN,
    estimates,
  };
}

function percentile90(a) {
  const s = [...a].sort((x, y) => x - y), pos = 0.9 * (s.length - 1), lo = Math.floor(pos), hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
