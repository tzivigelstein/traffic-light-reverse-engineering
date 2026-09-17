import { t } from "../i18n/es.js";
import { escapeHtml } from "../lib/dom.js";
import { formatLongDate } from "../lib/format.js";
import { crossingStatus, liveModel, missingWaits } from "../model/crossings.js";
import { getCrossing, getRoute, isRepeatedRoute, walksThroughCrossing } from "../model/dataset.js";
import { cycleClockBlock } from "./cycle-clock.js";
import { backButton, routeShape, waitsProgress } from "./glyphs.js";
import { crossingKindLabel, crossingName, cycleSeconds, routeName, statusLabel, timeBandsText, walkingDirection } from "./labels.js";

function modelRow(model) {
  const bands = timeBandsText(model.includes);
  const detail = model.status === "observing"
    ? (model.missing ? t.labels.waitsMissing(model.missing) : t.labels.noCycle)
    : t.labels.cycleOf(cycleSeconds(model.cycle));
  return `<div class="item" style="cursor:default"><span class="text"><span class="name">${bands[0].toUpperCase() + bands.slice(1)}</span>
    <span class="small">${t.crossing.modelMeta(statusLabel(model.status), model.passes, model.waits, model.inferred, detail)}</span>
    ${model.status === "observing" ? waitsProgress(model.waits, model.missing) : ""}</span></div>`;
}

function routeRows(crossingId) {
  const passesByRoute = {};
  for (const walk of walksThroughCrossing(crossingId)) passesByRoute[walk.routeId] = (passesByRoute[walk.routeId] || 0) + 1;
  return Object.entries(passesByRoute).sort((a, b) => b[1] - a[1]).map(([routeId, passes]) => {
    const route = getRoute(+routeId);
    const count = `<span class="num">${passes}<small>${t.common.passes}</small></span>`;
    return isRepeatedRoute(route)
      ? `<button class="item" data-route="${route.id}">${routeShape(route.id)}<span class="text"><span class="name">${escapeHtml(routeName(route))}</span><span class="small">${t.crossing.repeatedRoute}</span></span>${count}</button>`
      : `<div class="item" style="cursor:default">${routeShape(route.id)}<span class="text"><span class="name">${t.crossing.looseWalk}</span><span class="small">${t.crossing.looseWalkHint}</span></span>${count}</div>`;
  }).join("");
}

export function crossingView(crossingId) {
  const crossing = getCrossing(crossingId);
  const status = crossingStatus(crossing), missing = missingWaits(crossing);
  const live = liveModel(crossing);
  const noPattern = `<p class="empty-note">${t.crossing.noPatternYet} ${missing ? t.crossing.noPatternMissing(missing) : t.crossing.noPatternNoCycle}</p>`;
  const changed = crossing.models.find((m) => m.planChange);
  const planChange = changed
    ? `<p class="notice">${t.crossing.planChanged(formatLongDate(changed.planChange.date), Math.round(changed.planChange.before * 100), Math.round(changed.planChange.after * 100))}</p>`
    : "";
  return `
    ${backButton()}
    <div class="detail-header"><h1>${escapeHtml(crossingName(crossing))}</h1>
      <p class="sub">${t.crossing.subtitle(walkingDirection(crossing.walkingDirection), crossingKindLabel(crossing.kind))}</p>
      <span class="status-badge ${status}">${t.crossing.badge(statusLabel(status), status === "observing" ? missing : null)}</span></div>
    ${planChange}
    ${live ? cycleClockBlock(crossing, live) : noPattern}
    <div class="section"><h3>${t.crossing.byDayAndTime}</h3><p class="small">${t.crossing.byDayAndTimeHint}</p>${crossing.models.map(modelRow).join("")}</div>
    <div class="section"><h3>${t.crossing.whoPasses}</h3>
      ${routeRows(crossingId)}
    </div>`;
}
