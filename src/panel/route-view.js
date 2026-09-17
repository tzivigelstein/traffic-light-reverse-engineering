import { t } from "../i18n/es.js";
import { escapeHtml } from "../lib/dom.js";
import { formatHm, formatKm, formatLongDate, formatMinutes, formatTime } from "../lib/format.js";
import { median, percentile, sum } from "../lib/stats.js";
import { crossingStatus } from "../model/crossings.js";
import { getRoute, totalWait } from "../model/dataset.js";
import { routeCrossings, walksOfRoute } from "../model/routes.js";
import { state } from "../model/state.js";
import { departuresChart, durationsChart } from "./charts.js";
import { backButton, crossingGlyph } from "./glyphs.js";
import { routeName, statusLabel } from "./labels.js";
import { enums } from "../i18n/es.js";

/** One row per walk of a route, newest first. */
export function walkRow(walk) {
  const waited = totalWait(walk);
  const meta = `${formatHm(walk.departure)}, ${formatMinutes(walk.duration)}${walk.complete ? "" : t.route.recordedHalfway}${walk.fixedPrecision ? t.route.fixedPrecisionSuffix : ""}`;
  const chip = waited
    ? `<span class="chip gap">${t.route.waitedChip(Math.round(waited))}</span>`
    : `<span class="chip neutral">${t.route.noWaitsChip}</span>`;
  return `<button class="item" data-walk="${walk.id}">
    <span class="text"><span class="name">${formatLongDate(walk.date)}</span><span class="small">${meta}</span></span>
    <span>${chip}</span></button>`;
}

/** Best departure windows computed by the analysis for each day type of this route. */
function recommendationsBlock(route) {
  const groups = (route.recommendations ?? []).filter((r) => r.windows?.length);
  if (!groups.length) return "";
  return groups.map((r) => {
    const windows = [...r.windows.slice(0, 8)].sort((a, b) => a[0] - b[0]);
    const rows = windows.map(([from, to]) =>
      `<div>${t.route.departureWindow(formatTime(from), formatTime(to))}<span class="small"> · ${t.route.departureIdeal(formatTime((from + to) / 2))}</span></div>`).join("");
    return `<div class="card"><h3>${t.route.bestDepartures}</h3>
      <p class="small">${t.route.bestDeparturesHint(enums.dayTypeTitle[r.dayType], formatHm(r.from), formatHm(r.to), Math.round(r.averageWait), Math.round(r.bestWait))}</p>
      <div class="windows">${rows}</div>
      <p class="small" style="margin-top:6px">${t.route.paceNote}</p></div>`;
  }).join("");
}

export function routeView(routeId) {
  const route = getRoute(routeId), walks = walksOfRoute(routeId);
  const complete = walks.filter((w) => w.complete);
  const base = complete.length ? complete : walks;
  const durations = base.map((w) => w.duration);
  const waits = base.map(totalWait);
  const crossings = routeCrossings(routeId);
  const returnRoute = route.returnRouteId != null ? getRoute(route.returnRouteId) : null;
  const withPattern = crossings.filter((x) => crossingStatus(x.crossing) !== "observing");
  const newestFirst = [...walks].sort((a, b) => (b.date + b.departure).localeCompare(a.date + a.departure));

  const crossingRows = crossings.map((x) => `<button class="item" data-crossing="${x.crossing.id}">${crossingGlyph(x.crossing)}
    <span class="text"><span class="name">${t.route.crossingAt(x.crossing.id, Math.round(x.distance / 10) * 10)}</span>
    <span class="small">${t.route.crossingWaits(statusLabel(crossingStatus(x.crossing)), x.waits, x.passes)}</span></span>
    <span class="num">${Math.round(x.meanWait)} s<small>${t.route.perPass}</small></span></button>`).join("");

  return `
    ${backButton()}
    <div class="detail-header" id="route-header">
      <h1>${escapeHtml(routeName(route))}</h1>
      <p class="sub">${t.route.timesCount(walks.length, state.period === "watch")} <button class="rename" data-rename="${routeId}">${t.route.rename}</button></p>
    </div>
    ${returnRoute ? `<p class="small">${t.route.hasReturn} <button class="link" data-route="${returnRoute.id}">${escapeHtml(routeName(returnRoute))}</button></p>` : ""}
    <div class="stat-grid">
      <div class="stat"><b>${formatKm(route.km)}</b><span>${t.route.lengthLabel}</span></div>
      <div class="stat"><b>${formatMinutes(median(durations))}</b><span>${t.route.typicalLabel(formatMinutes(percentile(durations, 0.25)), formatMinutes(percentile(durations, 0.75)))}</span></div>
      <div class="stat"><b>${Math.round(sum(waits) / Math.max(waits.length, 1))} s</b><span>${t.route.waitingLabel(waits.filter((v) => v > 0).length, waits.length)}</span></div>
      <div class="stat"><b>${crossings.length}</b><span>${t.route.crossingsLabel(crossings.length)}</span></div>
    </div>
    ${durationsChart(walks)}
    ${departuresChart(walks)}
    <div class="section"><h3>${t.route.crossingsOnTheWay}</h3>
      ${crossingRows || `<p class="empty-note">${t.route.noCrossings}</p>`}
      ${withPattern.length ? "" : `<p class="empty-note">${t.route.noConfirmedYet}</p>`}
    </div>
    ${recommendationsBlock(route)}
    <div class="section"><h3>${t.route.allTimes}</h3>
      ${newestFirst.map(walkRow).join("")}
    </div>`;
}
