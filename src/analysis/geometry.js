import { EARTH_RADIUS } from "./constants.js";
import { circularMean, mean, mod } from "./numeric.js";

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** lat/lon -> metres east/north of (lat0, lon0), equirectangular. */
export function toMetres(lat, lon, lat0, lon0) {
  return [(lon - lon0) * RAD * EARTH_RADIUS * Math.cos(lat0 * RAD), (lat - lat0) * RAD * EARTH_RADIUS];
}

export function toLatLon(x, y, lat0, lon0) {
  return [lat0 + (y / EARTH_RADIUS) * DEG, lon0 + (x / (EARTH_RADIUS * Math.cos(lat0 * RAD))) * DEG];
}

/** Distance from a point to a polyline plus the direction of the nearest segment. */
export function polylineDistance(px, py, xs, ys) {
  let best = Infinity, bdx = 0, bdy = 0;
  for (let i = 0; i < xs.length - 1; i++) {
    const ax = xs[i], ay = ys[i], dx = xs[i + 1] - ax, dy = ys[i + 1] - ay;
    const l2 = dx * dx + dy * dy || 1e-9;
    const t = Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / l2));
    const d = Math.hypot(ax + t * dx - px, ay + t * dy - py);
    if (d < best) { best = d; bdx = dx; bdy = dy; }
  }
  return { distance: best, dx: bdx, dy: bdy };
}

/* ---------- headings (degrees counter-clockwise from east, like atan2) ---------- */

export const headingDeg = (dx, dy) => mod(Math.atan2(dy, dx) * DEG, 360);

/** Smallest difference between two directions (0..180). */
export function directionDiff(a, b) {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

/** Smallest difference between two axes, where 0° and 180° are the same (0..90). */
export function axisDiff(a, b) {
  const d = Math.abs(a - b) % 180;
  return Math.min(d, 180 - d);
}

export const axisOf = (angle) => mod(angle, 180);

export const meanDirection = (angles) => mod(circularMean(angles.map((a) => a * RAD)) * DEG, 360);

/** Mean of axes: angles are doubled so that 0° and 180° coincide. */
export const meanAxis = (angles) => mod((circularMean(angles.map((a) => 2 * a * RAD)) * DEG) / 2, 180);

const HEADINGS = ["east", "northeast", "north", "northwest", "west", "southwest", "south", "southeast"];
export const headingName = (angle) => HEADINGS[Math.floor((mod(angle, 360) + 22.5) / 45) % 8];

const AXES = ["east-west", "northeast-southwest", "north-south", "northwest-southeast"];
export const axisName = (angle) => AXES[Math.floor((mod(angle, 180) + 22.5) / 45) % 4];

export const centroid = (points) => [mean(points.map((p) => p.x)), mean(points.map((p) => p.y))];
