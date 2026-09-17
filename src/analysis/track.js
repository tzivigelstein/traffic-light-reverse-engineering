import { MAX_WAIT, MIN_WAIT, STILL_SPEED } from "./constants.js";
import { toMetres } from "./geometry.js";
import { interp, linearFit, mean, median, movingAverage, percentile } from "./numeric.js";

/**
 * A walk resampled at 1 Hz in local metres, with smoothed position, speed and the
 * stops ("waits") found along it.
 *
 * @typedef {Object} Track
 * @property {string} name
 * @property {Float64Array} t        Unix seconds, 1 Hz
 * @property {Float64Array} x
 * @property {Float64Array} y
 * @property {Float64Array} xs       Smoothed x
 * @property {Float64Array} ys       Smoothed y
 * @property {Float64Array} speed    m/s
 * @property {number[]} lat          Raw latitudes (for the OSM bounding box)
 * @property {number[]} lon
 * @property {boolean} fixedPrecision
 * @property {number} walkSpeed      Typical walking speed of this walk
 * @property {Wait[]} waits
 *
 * @typedef {Object} Wait
 * @property {number} i0  First still sample
 * @property {number} i1  Last still sample
 * @property {number} cx
 * @property {number} cy
 * @property {number} start     Fitted arrival time
 * @property {number} end       Fitted departure time
 * @property {number} duration
 * @property {number} hx        Unit heading after leaving
 * @property {number} hy
 */

/** Build a Track from parsed GPX; null when the recording is too short. */
export function loadTrack({ name, points, hAcc }, lat0, lon0) {
  if (points.length < 30) return null;
  const sorted = [...points].sort((a, b) => a.t - b.t);
  const unique = sorted.filter((p, i) => i === 0 || p.t !== sorted[i - 1].t);
  const rawT = unique.map((p) => p.t), rawLat = unique.map((p) => p.lat), rawLon = unique.map((p) => p.lon);

  const t0 = Math.ceil(rawT[0]), t1 = Math.floor(rawT[rawT.length - 1]);
  const n = t1 - t0 + 1;
  if (n < 30) return null;
  const t = Float64Array.from({ length: n }, (_, i) => t0 + i);
  const lat = interp(t, rawT, rawLat), lon = interp(t, rawT, rawLon);
  const x = new Float64Array(n), y = new Float64Array(n);
  for (let i = 0; i < n; i++) [x[i], y[i]] = toMetres(lat[i], lon[i], lat0, lon0);
  const xs = movingAverage(x, 9), ys = movingAverage(y, 9);

  // Speed over a ±4 s window, edges padded with the nearest inner value.
  const k = 4, speed = new Float64Array(n);
  for (let i = k; i < n - k; i++) speed[i] = Math.hypot(xs[i + k] - xs[i - k], ys[i + k] - ys[i - k]) / (2 * k);
  for (let i = 0; i < k; i++) speed[i] = speed[k];
  for (let i = n - k; i < n; i++) speed[i] = speed[n - k - 1];

  const track = {
    name, t, x, y, xs, ys, speed, lat: rawLat, lon: rawLon,
    // Fixed-precision recording: in the reference data this mode never registered stops.
    fixedPrecision: hAcc.length > 20 && median(hAcc) > 2.4 && percentile(hAcc, 90) - median(hAcc) < 0.3,
  };
  const moving = Array.from(speed).filter((v) => v > 0.8);
  track.walkSpeed = moving.length > 20 ? median(moving) : 1.3;
  track.waits = detectWaits(track);
  return track;
}

/** Departure instant: a line fitted to the distance walked after the stop. */
function fitDeparture(track, i1, cx, cy) {
  const n = track.t.length;
  const a = Math.min(i1 + 3, n - 1), b = Math.min(i1 + 25, n - 1);
  if (b - a < 8) return track.t[i1];
  const ts = [], ds = [];
  for (let i = a; i < b; i++) { ts.push(track.t[i]); ds.push(Math.hypot(track.x[i] - cx, track.y[i] - cy)); }
  const { slope, intercept } = linearFit(ts, ds);
  if (slope < 0.5) return track.t[i1];
  return -intercept / slope;
}

/** Arrival instant: the smoothed speed takes a few seconds to notice you stopped. */
function fitArrival(track, i0, cx, cy) {
  const a = Math.max(i0 - 25, 0), b = Math.max(i0 - 3, 0);
  if (b - a < 8) return track.t[i0];
  const ts = [], ds = [];
  for (let i = a; i < b; i++) { ts.push(track.t[i]); ds.push(Math.hypot(track.x[i] - cx, track.y[i] - cy)); }
  const { slope, intercept } = linearFit(ts, ds);
  if (slope > -0.5) return track.t[i0];
  return Math.min(-intercept / slope, track.t[i0]);
}

function detectWaits(track) {
  const { speed, xs, ys } = track, n = speed.length;
  const still = Array.from(speed, (v) => v < STILL_SPEED);
  // Bridge short gaps where a wandering GPS made you "move" while standing.
  const idx = [];
  for (let i = 0; i < n; i++) if (still[i]) idx.push(i);
  for (let p = 0; p + 1 < idx.length; p++) {
    const a = idx[p], b = idx[p + 1];
    if (1 < b - a && b - a <= 6 && Math.hypot(xs[b] - xs[a], ys[b] - ys[a]) < 4) still.fill(true, a, b);
  }
  const waits = [];
  let i = 0;
  while (i < n) {
    if (!still[i]) { i++; continue; }
    let j = i;
    while (j + 1 < n && still[j + 1]) j++;
    const cx = mean(Array.from(xs.subarray(i, j + 1))), cy = mean(Array.from(ys.subarray(i, j + 1)));
    const farFromEnds = Math.hypot(cx - xs[0], cy - ys[0]) > 40 && Math.hypot(cx - xs[n - 1], cy - ys[n - 1]) > 40;
    const length = j - i + 1;
    if (MIN_WAIT <= length && length <= MAX_WAIT && i > 0 && j < n - 10 && farFromEnds) {
      const end = fitDeparture(track, j, cx, cy);
      const start = fitArrival(track, i, cx, cy);
      const j2 = Math.min(j + 20, n - 1);
      const hx = xs[j2] - xs[j], hy = ys[j2] - ys[j], hn = Math.hypot(hx, hy) || 1;
      waits.push({ i0: i, i1: j, cx, cy, start, end, duration: end - start, hx: hx / hn, hy: hy / hn });
    }
    i = j + 1;
  }
  return waits;
}
