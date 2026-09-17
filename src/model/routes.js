import { WATCH_SINCE } from "../config.js";
import { sum } from "../lib/stats.js";
import { dataset, isRepeatedRoute } from "./dataset.js";
import { state } from "./state.js";

/** Walks that match the active period filter. */
export const visibleWalks = () =>
  dataset.walks.filter((w) => state.period === "all" || w.date >= WATCH_SINCE);

export const walksOfRoute = (routeId) => visibleWalks().filter((w) => w.routeId === routeId);

/** The walk whose trace represents a route: a complete one if possible. */
export function referenceWalk(routeId) {
  const walks = walksOfRoute(routeId);
  return walks.find((w) => w.complete) || walks[0] || dataset.walks.find((w) => w.routeId === routeId);
}

/** Repeated routes with at least one visible walk, most walked first. */
export function repeatedRoutes() {
  return dataset.routes
    .filter(isRepeatedRoute)
    .map((route) => ({ route, walks: walksOfRoute(route.id) }))
    .filter((x) => x.walks.length)
    .sort((a, b) => b.walks.length - a.walks.length);
}

/** Visible walks that don't belong to a repeated route, newest first. */
export function looseWalks() {
  const loose = new Set(dataset.routes.filter((r) => !isRepeatedRoute(r)).map((r) => r.id));
  return visibleWalks().filter((w) => loose.has(w.routeId)).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Crossings along a route, with how far along the reference trace they sit,
 * how many walks passed and waited, and the mean wait per walk.
 */
export function routeCrossings(routeId) {
  const walks = walksOfRoute(routeId);
  if (!walks.length) return [];
  const ref = walks.find((w) => w.complete) || walks[0];
  const cumulative = [0];
  for (let i = 1; i < ref.points.length; i++) {
    const [ax, ay] = ref.points[i - 1], [bx, by] = ref.points[i];
    cumulative.push(cumulative[i - 1] + Math.hypot(bx - ax, by - ay));
  }
  const out = [];
  for (const crossing of dataset.crossings) {
    const passing = walks.filter((w) => w.crossings.some((x) => x.crossingId === crossing.id));
    if (passing.length < Math.max(1, walks.length * 0.3)) continue;
    let nearest = 0, nearestDistance = Infinity;
    ref.points.forEach(([px, py], i) => {
      const d = Math.hypot(px - crossing.x, py - crossing.y);
      if (d < nearestDistance) { nearestDistance = d; nearest = i; }
    });
    const waited = passing.filter((w) => w.crossings.some((x) => x.crossingId === crossing.id && x.wait > 0));
    const waitPerWalk = passing.map((w) => sum(w.crossings.filter((x) => x.crossingId === crossing.id).map((x) => x.wait)));
    out.push({
      crossing,
      distance: cumulative[nearest],
      passes: passing.length,
      waits: waited.length,
      meanWait: sum(waitPerWalk) / walks.length,
    });
  }
  return out.sort((a, b) => a.distance - b.distance);
}
