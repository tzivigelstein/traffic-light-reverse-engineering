import { dataset, getCrossing, getWalk, isRepeatedRoute } from "./dataset.js";
import { routeCrossings, visibleWalks, walksOfRoute } from "./routes.js";
import { state } from "./state.js";

/** World points the map should frame for the current selection. */
export function selectionPoints() {
  const sel = state.selection;
  if (!sel) {
    const repeated = new Set(dataset.routes.filter(isRepeatedRoute).map((r) => r.id));
    return visibleWalks().filter((w) => repeated.has(w.routeId)).flatMap((w) => w.points);
  }
  if (sel.type === "route") return walksOfRoute(sel.id).flatMap((w) => w.points);
  if (sel.type === "walk") return getWalk(sel.id).points;
  if (sel.type === "crossing") {
    const c = getCrossing(sel.id);
    return [[c.x - 70, c.y - 70], [c.x + 70, c.y + 70]];
  }
  return [];
}

/** Crossing ids relevant to the selection (to fade the rest), or null for "all". */
export function relevantCrossingIds() {
  const sel = state.selection;
  if (sel?.type === "route") return new Set(routeCrossings(sel.id).map((x) => x.crossing.id));
  if (sel?.type === "walk") return new Set(getWalk(sel.id).crossings.map((x) => x.crossingId));
  return null;
}

/** Walk ids to highlight, and the single walk to isolate, for the current selection. */
export function traceEmphasis() {
  const sel = state.selection;
  if (sel?.type === "route") return { highlighted: new Set(walksOfRoute(sel.id).map((w) => w.id)), solo: null };
  if (sel?.type === "walk") return { highlighted: null, solo: sel.id };
  if (sel?.type === "crossing") {
    return { highlighted: new Set(dataset.walks.filter((w) => w.crossings.some((x) => x.crossingId === sel.id)).map((w) => w.id)), solo: null };
  }
  return { highlighted: null, solo: null };
}
