import { enums, t } from "../i18n/es.js";
import { escapeHtml } from "../lib/dom.js";
import { formatDecimal, formatHm, formatKmNumber, formatLongDate, formatMinutes } from "../lib/format.js";
import { median, percentile, sum } from "../lib/stats.js";
import { bestModel, crossingStatus, liveModel, missingWaits, statusRank } from "../model/crossings.js";
import { dataset, hasData, walksThroughCrossing } from "../model/dataset.js";
import { looseWalks, repeatedRoutes, visibleWalks } from "../model/routes.js";
import { state } from "../model/state.js";
import { crossingGlyph, routeShape, waitsProgress } from "./glyphs.js";
import { cycleSeconds, routeName, statusLabel, walkingDirection } from "./labels.js";

function routesTab() {
  const repeated = repeatedRoutes().map(({ route, walks }) => {
    const complete = walks.filter((w) => w.complete);
    const durations = (complete.length ? complete : walks).map((w) => w.duration);
    const departures = walks.map((w) => w.departure);
    return `<button class="item" data-route="${route.id}">${routeShape(route.id)}
      <span class="text"><span class="name">${escapeHtml(routeName(route))}</span>
      <span class="small">${t.list.routeMeta(formatMinutes(median(durations)), formatHm(percentile(departures, 0.1)), formatHm(percentile(departures, 0.9)))}</span></span>
      <span class="num">${walks.length}<small>${t.list.timesUnit}</small></span></button>`;
  }).join("");

  const loose = looseWalks().map((walk) => `<button class="item" data-walk="${walk.id}">${routeShape(walk.routeId)}
    <span class="text"><span class="name">${formatLongDate(walk.date)}</span><span class="small">${t.list.walkMeta(formatHm(walk.departure), formatMinutes(walk.duration))}</span></span>
    <span class="num">${formatDecimal(walk.km, 1)}<small>km</small></span></button>`).join("");

  return `
    <div class="section"><h3>${t.list.repeatedRoutes}</h3>
      <p class="small">${t.list.repeatedRoutesHint}</p>
      ${repeated || `<p class="empty-note">${t.list.noRepeatedRoutes}</p>`}
    </div>
    <div class="section"><h3>${t.list.looseWalks}</h3>
      ${loose || `<p class="empty-note">${t.list.noLooseWalks}</p>`}
    </div>`;
}

function crossingsTab() {
  const crossings = [...dataset.crossings].sort((a, b) =>
    statusRank(crossingStatus(b)) - statusRank(crossingStatus(a)) || b.passes - a.passes);
  const rows = crossings.map((crossing) => {
    const routeCount = new Set(walksThroughCrossing(crossing.id).map((w) => w.routeId)).size;
    const best = bestModel(crossing);
    const missing = missingWaits(crossing);
    const live = liveModel(crossing);
    const cycleText = live ? t.list.crossingCycle(cycleSeconds(live.cycle), live.provisional) : t.list.crossingUnknownCycle;
    return `<button class="item" data-crossing="${crossing.id}">${crossingGlyph(crossing)}
      <span class="text"><span class="name">${t.list.crossingName(crossing.id, walkingDirection(crossing.walkingDirection))}</span>
      <span class="small">${t.list.crossingMeta(statusLabel(crossingStatus(crossing)), crossing.passes, routeCount)} ${cycleText}</span>
      ${waitsProgress(best.waits, best.missing)}</span>
      <span class="num">${missing ?? t.common.dash}<small>${missing ? t.list.waitsMissingUnit : t.common.noPattern}</small></span></button>`;
  }).join("");
  return `
    <div class="section"><h3>${t.list.detectedCrossings}</h3>
      <p class="small">${t.list.detectedCrossingsHint}</p>
      ${rows}
    </div>`;
}

export function listView() {
  if (!hasData) {
    return `<div class="empty-state"><h2>${t.list.emptyTitle}</h2><p class="small">${t.list.emptyHint}</p>
      <button class="primary" data-open-data-sheet>${t.list.emptyAction}</button></div>`;
  }
  const walks = visibleWalks();
  const totalKm = sum(walks.map((w) => w.km));
  return `
    <div class="top-row">
      <div class="segmented" role="group" aria-label="${t.list.tabsAria}">
        <button aria-pressed="${state.listTab === "routes"}" data-list-tab="routes">${t.list.tabRoutes}</button>
        <button aria-pressed="${state.listTab === "crossings"}" data-list-tab="crossings">${t.list.tabCrossings}</button>
      </div>
    </div>
    <div class="chips" role="group" aria-label="${t.list.periodAria}">
      <button aria-pressed="${state.period === "all"}" data-period="all">${t.list.periodAll}</button>
      <button aria-pressed="${state.period === "watch"}" data-period="watch">${t.list.periodWatch}</button>
    </div>
    <p class="top-summary">${t.list.summary(walks.length, formatKmNumber(totalKm))}</p>
    ${state.listTab === "routes" ? routesTab() : crossingsTab()}`;
}
