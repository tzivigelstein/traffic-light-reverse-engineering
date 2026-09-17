import { axisName, headingName, toLatLon } from "./geometry.js";
import { formatClock, localIsoDate, localWeekday, localSeconds } from "./local-time.js";
import { median } from "./numeric.js";

/**
 * Turn analysis results into the app dataset (schema in src/model/types.js):
 * simplified walks, routes, crossings and the real origin (your most frequent start).
 */
export function buildDataset(tracks, results, lat0, lon0) {
  const starts = tracks.map((t) => [t.xs[0], t.ys[0]]);
  // Origin: the start with most other starts within 150 m (ties: the latest walk).
  let best = -1, bestCount = -1;
  starts.forEach((p, i) => {
    const count = starts.filter((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 150).length;
    if (count >= bestCount) { bestCount = count; best = i; }
  });
  const [ox, oy] = starts[best];
  const [originLat, originLon] = toLatLon(ox, oy, lat0, lon0);

  const passesByWalk = new Map();
  for (const c of results.crossings) {
    for (const m of c.models) {
      for (const d of m.detail) {
        if (!passesByWalk.has(d.walk)) passesByWalk.set(d.walk, []);
        passesByWalk.get(d.walk).push({ crossingId: c.id, time: formatClock(d.time), wait: d.wait, inferred: d.inferred });
      }
    }
  }

  const walks = tracks.map((t) => {
    const every2nd = [];
    for (let i = 0; i < t.xs.length; i += 2) every2nd.push([t.xs[i], t.ys[i]]);
    const points = simplify(every2nd, 4);
    let km = 0;
    for (let i = 1; i < t.xs.length; i++) km += Math.hypot(t.xs[i] - t.xs[i - 1], t.ys[i] - t.ys[i - 1]);
    return {
      id: t.name.replace(/\.[^.]*$/, ""),
      routeId: t.route,
      complete: t.complete !== false,
      date: localIsoDate(t.t[0]),
      weekday: localWeekday(t.t[0]),
      departure: Math.floor(localSeconds(t.t[0])),
      duration: Math.round(t.t[t.t.length - 1] - t.t[0]),
      km: Number((km / 1000).toFixed(2)),
      fixedPrecision: Boolean(t.fixedPrecision),
      stops: t.waits.map((w) => ({ x: Math.round(w.cx - ox), y: Math.round(w.cy - oy), seconds: Math.round(w.duration) })),
      crossings: passesByWalk.get(t.name) ?? [],
      points: points.map(([x, y]) => [Math.round(x - ox), Math.round(y - oy)]),
    };
  });

  const byRoute = new Map();
  for (const w of walks) {
    if (!byRoute.has(w.routeId)) byRoute.set(w.routeId, []);
    byRoute.get(w.routeId).push(w);
  }
  const routes = [...byRoute].map(([id, ws]) => {
    const complete = ws.filter((w) => w.complete);
    const base = complete.length ? complete : ws;
    const p = base[Math.floor(base.length / 2)].points;
    const angle = (Math.atan2(p[p.length - 1][1] - p[0][1], p[p.length - 1][0] - p[0][0]) * 180) / Math.PI;
    return { id, count: ws.length, heading: headingName(angle), km: Number(median(base.map((w) => w.km)).toFixed(2)), returnRouteId: null };
  });
  for (const r1 of routes) {
    for (const r2 of routes) {
      if (r1 === r2 || r1.count < 3 || r2.count < 3) continue;
      const p1 = byRoute.get(r1.id).find((w) => w.complete)?.points;
      const p2 = byRoute.get(r2.id).find((w) => w.complete)?.points;
      if (!p1 || !p2) continue;
      const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 150;
      if (near(p1[0], p2[p2.length - 1]) && near(p1[p1.length - 1], p2[0])) r1.returnRouteId = r2.id;
    }
  }
  // Departure recommendations, attached to the route they belong to.
  for (const rr of results.routes) {
    const route = routes.find((r) => r.id === rr.route);
    if (!route) continue;
    (route.recommendations ??= []).push({
      dayType: rr.dayType, walks: rr.walks, from: rr.from, to: rr.to,
      crossings: rr.crossings,
      windows: rr.windows ?? null, averageWait: rr.averageWait ?? null, bestWait: rr.bestWait ?? null,
    });
  }

  const crossings = results.crossings.map((c) => ({
    id: c.id, x: Math.round(c.x - ox), y: Math.round(c.y - oy), axis: Math.round(c.axis),
    walkingDirection: axisName(c.axis), passes: c.passes, kind: c.kind, street: c.street,
    models: c.models.map(({ detail, ...m }) => m),
  }));

  return {
    updatedAt: walks.map((w) => w.date).sort().at(-1),
    origin: { lat: originLat, lon: originLon },
    routes, crossings, walks,
  };
}

/** Ramer–Douglas–Peucker line simplification. */
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-9;
  let maxD = -1, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / len;
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD > eps) return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)];
  return [pts[0], pts[pts.length - 1]];
}
