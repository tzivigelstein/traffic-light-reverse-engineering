import { t } from "../i18n/es.js";
import { escapeHtml } from "../lib/dom.js";
import { formatHm, formatKm, formatLongDate, formatMinutes } from "../lib/format.js";
import { dataset, getCrossing, getRoute, getWalk, isRepeatedRoute } from "../model/dataset.js";
import { backButton, crossingGlyph } from "./glyphs.js";
import { crossingName, routeName } from "./labels.js";

/** Stops farther than this from any known crossing count as "other stops". */
const CROSSING_RADIUS_M = 30;

export function walkView(walkId) {
  const walk = getWalk(walkId), route = getRoute(walk.routeId);
  const otherStops = walk.stops.filter((s) => !dataset.crossings.some((c) => Math.hypot(c.x - s.x, c.y - s.y) < CROSSING_RADIUS_M));

  const routeLine = isRepeatedRoute(route)
    ? `${t.walk.routePrefix} <button class="link" data-route="${route.id}">${escapeHtml(routeName(route))}</button>`
    : t.walk.looseWalk;

  const crossingRows = walk.crossings.map((pass) => {
    const chip = pass.wait
      ? `<span class="chip gap">${t.walk.waitedChip(Math.round(pass.wait))}</span>`
      : `<span class="chip neutral">${t.walk.noWaitChip}</span>`;
    return `<button class="item" data-crossing="${pass.crossingId}">${crossingGlyph(getCrossing(pass.crossingId))}
      <span class="text"><span class="name">${escapeHtml(crossingName(getCrossing(pass.crossingId)))}</span><span class="small">${t.walk.passedAt(pass.time, pass.inferred)}</span></span>
      <span>${chip}</span></button>`;
  }).join("");

  return `
    ${backButton()}
    <div class="detail-header"><h1>${formatLongDate(walk.date)}</h1>
      <p class="sub">${t.walk.departedAt(formatHm(walk.departure))} ${routeLine}</p></div>
    <div class="stat-grid">
      <div class="stat"><b>${formatMinutes(walk.duration)}</b><span>${t.walk.durationLabel}</span></div>
      <div class="stat"><b>${formatKm(walk.km)}</b><span>${t.walk.distanceLabel}</span></div>
      <div class="stat"><b>${walk.stops.length}</b><span>${t.walk.stopsLabel(walk.stops.length)}</span></div>
      <div class="stat"><b>${walk.fixedPrecision ? t.walk.fixedPrecision : t.walk.normal}</b><span>${walk.fixedPrecision ? t.walk.fixedPrecisionHint : t.walk.normalHint}</span></div>
    </div>
    <div class="section"><h3>${t.walk.atCrossings}</h3>
      ${crossingRows || `<p class="empty-note">${t.walk.noCrossings}</p>`}
    </div>
    ${otherStops.length ? `<div class="section"><h3>${t.walk.otherStops}</h3><p class="small">${t.walk.otherStopsHint(otherStops.length)}</p></div>` : ""}`;
}
