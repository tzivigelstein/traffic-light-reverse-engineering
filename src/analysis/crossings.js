import { GROUP_RADIUS, INTERSECTION_RADIUS, MIN_DELAY, POINT_RADIUS } from "./constants.js";
import { axisOf, centroid, directionDiff, headingDeg, meanDirection } from "./geometry.js";
import { bandOf, dayTypeOf, localSeconds } from "./local-time.js";
import { argmin, max } from "./numeric.js";

/**
 * A "crossing" is a corner plus the street you cross there (the axis of your walk).
 * Every walk that goes through a crossing contributes data, whatever route it belongs to.
 *
 * @typedef {Object} CrossingPoint  A spot where you wait, plus the direction you continue in
 * @property {number} x
 * @property {number} y
 * @property {number} dir   Degrees, counter-clockwise from east
 * @property {boolean} [osm]  Came from a map signal rather than from waits
 *
 * @typedef {Object} DetectedCrossing
 * @property {CrossingPoint[]} points  One or two (the facing corner of the way back)
 * @property {number} axis
 * @property {number} x
 * @property {number} y
 * @property {number} hx
 * @property {number} hy
 * @property {"waits"|"osm"} origin
 */

/** Direction you moved in when leaving sample i (degrees), or null near the end. */
export function departureHeading(track, i, dist = 20) {
  const { xs, ys } = track, x0 = xs[i], y0 = ys[i];
  for (let j = i; j < xs.length; j++) {
    if (Math.hypot(xs[j] - x0, ys[j] - y0) >= dist) return headingDeg(xs[j] - x0, ys[j] - y0);
  }
  return null;
}

/**
 * "Through" direction: from `dist` metres before to `dist` metres after sample i.
 * Ignores the zigzags you make to dodge cars in between.
 */
export function passHeading(track, i, dist = 20) {
  const { xs, ys } = track, x0 = xs[i], y0 = ys[i];
  let j0 = -1, j1 = -1;
  for (let j = i - 1; j >= 0; j--) if (Math.hypot(xs[j] - x0, ys[j] - y0) >= dist) { j0 = j; break; }
  for (let j = i; j < xs.length; j++) if (Math.hypot(xs[j] - x0, ys[j] - y0) >= dist) { j1 = j; break; }
  if (j0 < 0 || j1 < 0) return null;
  return headingDeg(xs[j1] - xs[j0], ys[j1] - ys[j0]);
}

/**
 * Wait points (place + direction you continue in) and the crossings they form.
 *
 * Two points are the same crossing only if they face each other: opposite directions and
 * each on the far side of the other (the way out waits on one kerb, the way back on the
 * opposite one). Two consecutive waits in the same direction, like an avenue with a
 * central island, are different crossings.
 */
export function detectCrossings(tracks, minTracks = 2) {
  const waits = [];
  for (const track of tracks) {
    for (const wait of track.waits) {
      const dir = departureHeading(track, wait.i1);
      if (dir != null) waits.push({ x: wait.cx, y: wait.cy, dir, track: track.name });
    }
  }
  const groups = [];
  for (const w of waits) {
    const group = groups.find((g) => Math.hypot(g.x - w.x, g.y - w.y) < GROUP_RADIUS && directionDiff(g.dir, w.dir) < 45);
    if (group) {
      group.members.push(w);
      [group.x, group.y] = centroid(group.members);
      group.dir = meanDirection(group.members.map((m) => m.dir));
    } else {
      groups.push({ members: [w], x: w.x, y: w.y, dir: w.dir });
    }
  }
  const points = groups
    .filter((g) => new Set(g.members.map((m) => m.track)).size >= minTracks)
    .map((g) => ({ x: g.x, y: g.y, dir: g.dir }));
  return buildCrossings(points);
}

function faceEachOther(p, q) {
  if (directionDiff(p.dir, q.dir) < 135) return false;
  const dx = q.x - p.x, dy = q.y - p.y, dist = Math.hypot(dx, dy);
  if (dist >= INTERSECTION_RADIUS) return false;
  // Same spot: fine for a map signal; with real waits, two opposite directions at the
  // same point are two crossings (central island).
  if (dist < 4) return Boolean(p.osm && q.osm);
  if (dist < 6) return false;
  const ux = Math.cos((p.dir * Math.PI) / 180), uy = Math.sin((p.dir * Math.PI) / 180);
  return (dx * ux + dy * uy) / dist > 0.5;
}

/** Pair facing points greedily by distance; every point ends up in exactly one crossing. */
export function buildCrossings(points) {
  const pairs = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (faceEachOther(points[i], points[j])) pairs.push([Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y), i, j]);
    }
  }
  pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  const partner = new Map();
  for (const [, i, j] of pairs) {
    if (!partner.has(i) && !partner.has(j)) { partner.set(i, j); partner.set(j, i); }
  }
  const crossings = [], seen = new Set();
  points.forEach((p, i) => {
    if (seen.has(i)) return;
    const group = [p];
    seen.add(i);
    if (partner.has(i)) { group.push(points[partner.get(i)]); seen.add(partner.get(i)); }
    const axis = axisOf(p.dir);
    const [x, y] = centroid(group);
    crossings.push({ points: group, axis, x, y, hx: Math.cos((axis * Math.PI) / 180), hy: Math.sin((axis * Math.PI) / 180), origin: "waits" });
  });
  return crossings;
}

/** Map signals you walk through but almost never stop at. */
export function addSignalsWithoutWaits(crossings, tracks, signals) {
  for (const [sx, sy] of signals) {
    const dirs = [];
    for (const track of tracks) {
      const d = Array.from(track.xs, (x, i) => Math.hypot(x - sx, track.ys[i] - sy));
      const i = argmin(d);
      if (d[i] < POINT_RADIUS) {
        const dir = departureHeading(track, i);
        if (dir != null) dirs.push(dir);
      }
    }
    const fresh = [];
    for (const a of dirs) {
      if (fresh.some((n) => directionDiff(a, n.dir) < 45)) continue;
      const support = dirs.filter((b) => directionDiff(a, b) < 30);
      if (support.length < 3 || support.length < 0.2 * dirs.length) continue; // an odd heading from one or two walks is not enough
      const known = crossings.some((c) => c.points.some((q) => directionDiff(a, q.dir) < 45 && Math.hypot(q.x - sx, q.y - sy) < INTERSECTION_RADIUS));
      if (known) continue;
      fresh.push({ x: sx, y: sy, osm: true, dir: meanDirection(support) });
    }
    for (const c of buildCrossings(fresh)) { c.origin = "osm"; crossings.push(c); }
  }
}

/**
 * Extra time spent passing a corner compared with your own pace on that walk.
 * @returns {[delay, arrival, release] | null}
 */
export function delay(track, d, ic, radius = 25) {
  const n = d.length;
  let i0 = ic, i1 = ic;
  while (i0 > 0 && d[i0 - 1] < radius) i0--;
  while (i1 < n - 1 && d[i1 + 1] < radius) i1++;
  if (i0 === 0 || i1 === n - 1) return null;
  const v = track.walkSpeed;
  const lost = track.t[i1] - track.t[i0] - (d[i0] + d[i1]) / v;
  const release = track.t[i1] - (d[i1] + 8) / v;
  return [lost, release - Math.max(lost, 0), release];
}

/**
 * The pass of one walk through one crossing, or null if the walk does not go through it
 * in the crossing's direction.
 *
 * @typedef {Object} PassEvent
 * @property {string} track
 * @property {number} pass       Unix seconds when you cleared the crossing
 * @property {number|null} wait  Seconds waited (null: none)
 * @property {number} [start]    Arrival, when you waited
 * @property {number} [release]  When you got going again
 * @property {boolean} [inferred] Wait deduced from delay, not from a detected stop
 * @property {number} weight
 * @property {number} departure  Walk start
 * @property {"weekday"|"weekend"} dayType
 * @property {string} band
 */
export function crossingEvent(track, crossing) {
  const pts = crossing.points, n = track.t.length;
  const dist = pts.map((q) => Array.from(track.xs, (x, i) => Math.hypot(x - q.x, track.ys[i] - q.y)));
  const nearestAny = new Float64Array(n);
  for (let i = 0; i < n; i++) nearestAny[i] = Math.min(...pts.map((_, k) => dist[k][i]));
  let ic = argmin(nearestAny);
  if (nearestAny[ic] > POINT_RADIUS) return null;

  // the immediate exit (useful when you turn) or the through direction (useful when you
  // zigzag to dodge), the latter more demanding
  const matches = (q, i) => {
    const a1 = departureHeading(track, i), a2 = passHeading(track, i);
    return (a1 != null && directionDiff(q.dir, a1) < 45) || (a2 != null && directionDiff(q.dir, a2) < 30);
  };
  // only the points of this crossing that face your direction count
  const valid = pts.map((q, k) => (matches(q, ic) ? k : -1)).filter((k) => k >= 0);
  if (!valid.length) return null;
  const d = new Float64Array(n);
  for (let i = 0; i < n; i++) d[i] = Math.min(...valid.map((k) => dist[k][i]));
  ic = argmin(d);
  if (d[ic] > POINT_RADIUS) return null;
  const kPoint = valid[argmin(valid.map((k) => dist[k][ic]))];
  if (!matches(pts[kPoint], ic)) return null;
  const dir = pts[kPoint].dir, passDir = departureHeading(track, ic);
  const dPoint = dist[kPoint];                    // delay is measured against a single point
  const ev = { track: track.name, pass: track.t[ic], wait: null, departure: track.t[0], weight: 1 };

  const candidates = track.waits.filter((w) => {
    const near = Math.min(...valid.map((k) => Math.hypot(w.cx - pts[k].x, w.cy - pts[k].y))) < POINT_RADIUS;
    if (!near || !(-180 <= ev.pass - w.end && ev.pass - w.end <= 40)) return false;
    const a2 = departureHeading(track, w.i1), a3 = passHeading(track, w.i1);
    return (a2 != null && directionDiff(a2, dir) < 45)
      || (a2 != null && passDir != null && directionDiff(a2, passDir) < 45)
      || (a3 != null && directionDiff(a3, dir) < 30);
  });
  if (candidates.length) {
    const w = candidates.reduce((a, b) => (b.end > a.end ? b : a));
    Object.assign(ev, { wait: w.duration, start: w.start, release: w.end });
    ev.pass = Math.max(ev.pass, w.end);
  } else {
    const lost = delay(track, dPoint, ic);
    if (lost) {
      ev.delay = lost[0];
      if (lost[0] >= MIN_DELAY) {
        // no stop registered but you took longer: inferred wait, half weight
        Object.assign(ev, { wait: lost[0], start: lost[1], release: lost[2], inferred: true, weight: 0.5 });
        ev.pass = Math.max(ev.pass, lost[2]);
      }
    }
  }
  ev.dayType = dayTypeOf(ev.pass);
  ev.band = bandOf(localSeconds(ev.pass), ev.dayType);
  return ev;
}

/** Summarise a band's events for the cycle fitter. @returns {import("./cycle.js").PlaceData} */
export function placeData(events) {
  const waits = events.filter((e) => e.wait);
  return {
    te: waits.map((e) => localSeconds(e.release)),
    ts: waits.map((e) => localSeconds(e.start)),
    tp: events.filter((e) => !e.wait).map((e) => localSeconds(e.pass)),
    dur: waits.map((e) => e.wait),
    w: waits.map((e) => e.weight ?? 1),
    maxWait: waits.length ? max(waits.map((e) => e.wait)) : 0,
    n: events.length,
  };
}
