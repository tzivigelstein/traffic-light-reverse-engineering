const sorted = (values) => [...values].sort((a, b) => a - b);

export function median(values) {
  const s = sorted(values);
  if (!s.length) return NaN;
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Empirical quantile q in [0, 1]. */
export function percentile(values, q) {
  const s = sorted(values);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

export const sum = (values) => values.reduce((a, b) => a + b, 0);
