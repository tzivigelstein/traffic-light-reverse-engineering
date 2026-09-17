import { t } from "../i18n/es.js";
import { crossingStatus } from "../model/crossings.js";
import { referenceWalk } from "../model/routes.js";

/** Small inline SVGs used in list rows. */

const BACK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>`;

export const backButton = () => `<button class="back" data-back>${BACK_ICON}${t.common.back}</button>`;

/** Thumbnail of a route's shape, normalised into a 52x52 box. */
export function routeShape(routeId) {
  const points = referenceWalk(routeId).points;
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = 38 / Math.max(x1 - x0, y1 - y0, 1);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const scaled = points.map(([x, y]) => [26 + (x - cx) * k, 26 - (y - cy) * k]);
  const d = "M" + scaled.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L");
  return `<svg class="route-shape" viewBox="0 0 52 52" aria-hidden="true"><path d="${d}"/><circle cx="${scaled[0][0].toFixed(1)}" cy="${scaled[0][1].toFixed(1)}" r="3"/></svg>`;
}

/** A crossing as a street segment with a status dot. */
export function crossingGlyph(crossing) {
  const status = crossingStatus(crossing);
  const angle = (crossing.axis * Math.PI) / 180;
  const dx = Math.cos(angle) * 14, dy = -Math.sin(angle) * 14;
  const fill = status === "confirmed" ? "var(--ink)" : "var(--surface)";
  const strokeWidth = status === "probable" ? 4 : 2.5;
  const dash = status === "observing" ? 'stroke-dasharray="3 2.5"' : "";
  return `<svg class="glyph" viewBox="0 0 52 52" aria-hidden="true">
    <line x1="${26 - dx}" y1="${26 - dy}" x2="${26 + dx}" y2="${26 + dy}" stroke="var(--line)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="26" cy="26" r="8" fill="${fill}" stroke="var(--ink)" stroke-width="${strokeWidth}" ${dash}/></svg>`;
}

/** Progress towards the waits needed to confirm a cycle. Empty when nothing is missing. */
export function waitsProgress(waits, missing) {
  if (!missing) return "";
  const total = waits + missing;
  return `<span class="progress" role="img" aria-label="${t.labels.progressAria(waits, total)}"><i style="width:${Math.round((waits / total) * 100)}%"></i></span>`;
}
