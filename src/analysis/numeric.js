/** Small numeric toolkit standing in for the numpy calls of the original script. */

export const sum = (a) => a.reduce((acc, v) => acc + v, 0);
export const mean = (a) => (a.length ? sum(a) / a.length : NaN);

export function median(a) {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y), mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** numpy.percentile with linear interpolation. */
export function percentile(a, p) {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const pos = (p / 100) * (s.length - 1), lo = Math.floor(pos), hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/** Population standard deviation (numpy default). */
export function std(a) {
  const m = mean(a);
  return Math.sqrt(mean(a.map((v) => (v - m) ** 2)));
}

export const max = (a) => a.reduce((acc, v) => (v > acc ? v : acc), -Infinity);
export const min = (a) => a.reduce((acc, v) => (v < acc ? v : acc), Infinity);

export function argmin(a) {
  let best = 0;
  for (let i = 1; i < a.length; i++) if (a[i] < a[best]) best = i;
  return best;
}
export function argmax(a) {
  let best = 0;
  for (let i = 1; i < a.length; i++) if (a[i] > a[best]) best = i;
  return best;
}

/** Positive modulo, like Python's `%`. */
export const mod = (x, m) => ((x % m) + m) % m;

/** Python's round(): half to even. Matters when rounding sums of 0.5 weights. */
export function roundHalfEven(x) {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - Math.sign(x) : r;
}

export const clip = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** Ordinary least squares y = slope·x + intercept (x is centred first: timestamps are ~1e9). */
export function linearFit(x, y) {
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0;
  for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; }
  const slope = sxx ? sxy / sxx : 0;
  return { slope, intercept: my - slope * mx };
}

/** numpy.interp: xs must be increasing; clamps outside the range. */
export function interp(xNew, xs, ys) {
  const out = new Float64Array(xNew.length);
  let j = 0;
  for (let i = 0; i < xNew.length; i++) {
    const x = xNew[i];
    if (x <= xs[0]) { out[i] = ys[0]; continue; }
    if (x >= xs[xs.length - 1]) { out[i] = ys[ys.length - 1]; continue; }
    while (xs[j + 1] < x) j++;
    const f = (x - xs[j]) / (xs[j + 1] - xs[j]);
    out[i] = ys[j] + f * (ys[j + 1] - ys[j]);
  }
  return out;
}

/** Moving average of window w with edge padding (the script's `suavizar`). */
export function movingAverage(v, w) {
  const n = v.length, half = w >> 1, out = new Float64Array(n);
  const at = (i) => v[clip(i, 0, n - 1)];
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let k = -half; k < w - half; k++) acc += at(i + k);
    out[i] = acc / w;
  }
  return out;
}

/** Binomial coefficient as a float (n ≤ a few hundred). */
export function comb(n, k) {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

/** Upper tail P[X ≥ a] of Binomial(n, q). */
export function binomialTail(n, a, q) {
  let tail = 0;
  for (let i = a; i <= n; i++) tail += comb(n, i) * q ** i * (1 - q) ** (n - i);
  return tail;
}

/** Mean of angles given in radians, in (-π, π]. */
export function circularMean(angles) {
  let re = 0, im = 0;
  for (const a of angles) { re += Math.cos(a); im += Math.sin(a); }
  return Math.atan2(im / angles.length, re / angles.length);
}

/** Deterministic PRNG (mulberry32) with the two draws the recommender needs. */
export function createRng(seed = 0) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    uniform: next,
    normal(sd = 1) {
      const u = 1 - next(), v = next();
      return sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    choice: (a) => a[Math.floor(next() * a.length)],
  };
}
