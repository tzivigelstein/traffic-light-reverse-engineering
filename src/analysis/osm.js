import { CAR_SPEED, ROAD_RANK } from "./constants.js";
import { polylineDistance, toMetres } from "./geometry.js";

/** Streets and traffic signals from OpenStreetMap, via the Overpass API. */

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const MARGIN = 0.008; // degrees around the walks' bounding box

/** Bounding box [latMin, latMax, lonMin, lonMax] grown by the query margin. */
export function paddedBounds([latMin, latMax, lonMin, lonMax]) {
  return [latMin - MARGIN, latMax + MARGIN, lonMin - MARGIN, lonMax + MARGIN];
}

export const boundsContain = (outer, inner) =>
  outer[0] <= inner[0] && outer[1] >= inner[1] && outer[2] <= inner[2] && outer[3] >= inner[3];

export async function fetchOsm([latMin, latMax, lonMin, lonMax]) {
  const bbox = `${latMin - MARGIN},${lonMin - MARGIN},${latMax + MARGIN},${lonMax + MARGIN}`;
  const query = `[out:json][timeout:120];(` +
    `way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street)(_link)?$"](${bbox});` +
    `node["highway"="traffic_signals"](${bbox}););out geom;`;
  const res = await fetch(OVERPASS_URL, { method: "POST", body: new URLSearchParams({ data: query }) });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  return res.json();
}

/**
 * @returns {{ streets: Street[], signals: [number, number][] }}
 * @typedef {{ name: string|null, kind: string, oneway: string, lanes: string|undefined, xs: number[], ys: number[] }} Street
 */
export function prepareOsm(json, lat0, lon0) {
  const streets = [], signals = [];
  for (const el of json.elements ?? []) {
    const tags = el.tags ?? {};
    if (el.type === "node" && tags.highway === "traffic_signals") {
      signals.push(toMetres(el.lat, el.lon, lat0, lon0));
    } else if (el.type === "way" && (el.geometry?.length ?? 0) >= 2) {
      const pts = el.geometry.map((p) => toMetres(p.lat, p.lon, lat0, lon0));
      streets.push({
        name: tags.name ?? null,
        kind: (tags.highway ?? "").replace("_link", ""),
        oneway: tags.oneway ?? "no",
        lanes: tags.lanes,
        xs: pts.map((p) => p[0]),
        ys: pts.map((p) => p[1]),
      });
    }
  }
  return { streets, signals };
}

export const emptyLabel = () => ({ crosses: null, ownSignal: false, sources: [], twoWay: false });

/**
 * What the map says about a crossing point: which street you cross there, whether the
 * corner has its own signal, and which upstream signals release the traffic you wait for.
 */
export function labelCrossing(point, streets, signals) {
  const info = emptyLabel();
  if (signals.length) {
    info.ownSignal = Math.min(...signals.map(([sx, sy]) => Math.hypot(sx - point.x, sy - point.y))) < 25;
  }
  let best = null;
  for (const street of streets) {
    const { distance, dx, dy } = polylineDistance(point.x, point.y, street.xs, street.ys);
    const len = Math.hypot(dx, dy);
    if (distance > 30 || len === 0) continue;
    if (Math.abs(dx * point.hx + dy * point.hy) / len < 0.5) {   // perpendicular to your walk
      if (!best || distance < best.distance) best = { distance, street, ux: dx / len, uy: dy / len };
    }
  }
  if (!best) return info;
  const { street, ux, uy } = best;
  info.crosses = street;
  const oneway = String(street.oneway).toLowerCase();
  let dirs;
  if (["yes", "1", "true"].includes(oneway)) dirs = [[ux, uy]];
  else if (oneway === "-1") dirs = [[-ux, -uy]];
  else { dirs = [[ux, uy], [-ux, -uy]]; info.twoWay = true; }
  if (info.ownSignal) return info;

  const sameStreet = street.name ? streets.filter((s) => s.name === street.name) : [street];
  for (const [vx, vy] of dirs) {
    let nearest = null;
    for (const [sx, sy] of signals) {
      const along = (sx - point.x) * vx + (sy - point.y) * vy;
      const perp = Math.abs(-(sx - point.x) * vy + (sy - point.y) * vx);
      if (!(-800 < along && along < -15) || perp > 40) continue;
      if (Math.min(...sameStreet.map((s) => polylineDistance(sx, sy, s.xs, s.ys).distance)) > 12) continue;
      if (!nearest || along > nearest.along) nearest = { along, sx, sy };
    }
    if (nearest) {
      const { along, sx, sy } = nearest;
      const others = streets.filter((s) => s.name !== street.name && polylineDistance(sx, sy, s.xs, s.ys).distance < 15);
      const avenue = others.length
        ? others.reduce((a, b) => ((ROAD_RANK[b.kind] ?? 0) > (ROAD_RANK[a.kind] ?? 0) ? b : a)).name ?? "?"
        : "?";
      info.sources.push({ distance: -along, street: avenue, x: sx, y: sy, delay: -along / CAR_SPEED });
    }
  }
  return info;
}

/** Number of lanes in your crossing direction. */
export function lanes(street, twoWay) {
  const n = parseInt(String(street?.lanes).split(";")[0], 10);
  if (!Number.isFinite(n)) return twoWay ? 1 : 2;
  return twoWay ? Math.max(1, Math.floor(n / 2)) : n;
}
