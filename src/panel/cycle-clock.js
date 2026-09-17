import { enums, t } from "../i18n/es.js";
import { $, svgEl } from "../lib/dom.js";
import { formatMinutesSeconds, formatMonthShort, formatTime } from "../lib/format.js";
import { cycleArc, pointOnCycle } from "../lib/svg-arc.js";
import { cyclePosition } from "../lib/time.js";
import { onTick } from "../live-clock.js";
import { classifiedPasses, cyclePhases, firstGreenAfter, liveModel, withinBands } from "../model/crossings.js";
import { getCrossing } from "../model/dataset.js";
import { state } from "../model/state.js";
import { cycleSeconds, timeBandsText } from "./labels.js";

/** Cards explaining a crossing's cycle, plus the live clock that runs while the crossing is open. */

const CATEGORY_STYLE = {
  green: { color: "var(--green)", barClass: "cat-green" },
  waitedGreen: { color: "var(--ink)", barClass: "cat-waited" },
  crossedRed: { color: "var(--red)", barClass: "cat-red" },
  waitedGap: { color: "var(--amber)", barClass: "cat-gap" },
};
const CATEGORIES = Object.keys(CATEGORY_STYLE);

/** Ring radius per category, so the four kinds of pass don't overlap. */
const RING_RADIUS = { green: 100, crossedRed: 100, waitedGap: 88, waitedGreen: 76 };
const CENTER = 150, ARC_RADIUS = 124;
const UPCOMING_GREENS = 6;

function monthRows(byMonth) {
  return Object.keys(byMonth).sort().map((month) => {
    const k = byMonth[month];
    const total = CATEGORIES.reduce((acc, c) => acc + k[c], 0);
    const arrivedRed = k.waitedGreen + k.crossedRed + k.waitedGap;
    const bars = CATEGORIES.map((c) => k[c] ? `<i class="${CATEGORY_STYLE[c].barClass}" style="width:${(k[c] / total) * 100}%"></i>` : "").join("");
    const pct = arrivedRed >= 3
      ? `${Math.round(((k.crossedRed + k.waitedGap) / arrivedRed) * 100)}%`
      : `<span class="small">${t.clock.fewSamples}</span>`;
    return `<div class="month"><span>${t.clock.monthLabel(formatMonthShort(month), month.slice(2, 4))}</span><div class="bars">${bars}</div><span class="pct">${pct}</span></div>`;
  }).join("");
}

export function cycleClockBlock(crossing, live) {
  const { byMonth } = classifiedPasses(crossing, live);
  const bands = timeBandsText(live.model.includes);
  const { greenMin, greenMax } = cyclePhases(live);
  const cycle = cycleSeconds(live.cycle);
  const whole = (v) => String(Math.round(v));
  const pct = (seconds) => `${((seconds / live.cycle) * 100).toFixed(2)}%`;
  const certainty = enums.certainty[live.provisional ? "provisional" : "confirmed"];
  const legend = CATEGORIES.map((c) => `<span><i style="background:${CATEGORY_STYLE[c].color}"></i>${enums.passCategory[c]}</span>`).join("");

  return `
    <div class="card" style="padding-top:12px">
      <h3>${t.clock.durationTitle}</h3>
      <p class="small">${t.clock.durationHint(bands)}</p>
      <div class="cycle-bar" role="img" aria-label="${t.clock.cycleBarAria(whole(greenMin), whole(greenMax), cycle)}">
        <i style="left:0;width:${pct(greenMin)};background:var(--green)"></i>
        <i style="left:${pct(greenMin)};width:${pct(greenMax - greenMin)}" class="striped"></i>
        <i style="left:${pct(greenMax)};width:${pct(live.cycle - greenMax)};background:var(--red)"></i>
      </div>
      <div class="cycle-ticks"><span style="left:0">${t.clock.zeroSeconds}</span><span style="left:${pct(greenMin)}">${whole(greenMin)}</span><span style="left:${pct(greenMax)}">${whole(greenMax)}</span><span style="right:0">${cycle} s</span></div>
      <div class="facts">
        <div><b>${t.clock.fullCycle}</b><span>${t.clock.fullCycleValue(cycle, formatMinutesSeconds(live.cycle), certainty)}</span></div>
        <div><b>${t.clock.greenToCross}</b><span>${t.clock.greenToCrossValue(whole(greenMin), whole(greenMax))}</span></div>
        <div><b>${t.clock.red}</b><span>${t.clock.redValue(whole(live.cycle - greenMax), whole(live.cycle - greenMin))}</span></div>
        <div><b>${t.clock.greenStarts}</b><span>${t.clock.greenStartsValue(formatTime(firstGreenAfter(live)), cycle)}</span></div>
        <div><b>${t.clock.unknown}</b><span>${t.clock.unknownValue(live.provisional)}</span></div>
      </div>
    </div>
    <div class="card" style="padding-top:12px">
      <h3>${t.clock.liveTitle(live.provisional)}</h3>
      <p class="small">${t.clock.liveHint(bands, cycle, live.provisional)}</p>
      <div class="cycle-clock"><svg viewBox="0 -8 300 316" id="cycle-clock-svg" aria-hidden="true"></svg>
        <div class="center"><div class="light-state" id="light-state">–</div><div class="countdown" id="countdown"></div></div></div>
      <p class="visually-hidden" aria-live="polite" id="clock-announcer"></p>
      <div id="band-notice"></div>
      <p class="small" style="margin-top:8px">${t.clock.upcomingGreens}</p>
      <div class="upcoming" id="upcoming-greens"></div>
      <div class="legend" style="margin-top:10px">${legend}</div>
      <p class="small" style="margin-top:4px">${t.clock.ringHint}</p>
    </div>
    <div class="card"><h3>${t.clock.redArrivalTitle}</h3>
      <p class="small">${t.clock.redArrivalHint}</p>
      <div class="months" style="margin-top:8px">${monthRows(byMonth)}</div></div>`;
}

/** The clock currently mounted in the panel, or null. */
let activeClock = null;

/** Draw the ring into the freshly rendered panel (no-op unless a crossing with a live model is open). */
export function mountCycleClock() {
  activeClock = null;
  const svg = $("cycle-clock-svg");
  if (!svg || state.selection?.type !== "crossing") return;
  const crossing = getCrossing(state.selection.id), live = liveModel(crossing);
  if (!live) return;

  const cycle = live.cycle, { greenMin, greenMax } = cyclePhases(live);
  const defs = svgEl("defs", {}, svg);
  const pattern = svgEl("pattern", { id: "stripes", width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
  svgEl("rect", { width: 7, height: 7, fill: "var(--amber-soft)" }, pattern);
  svgEl("rect", { width: 3.5, height: 7, fill: "var(--amber)" }, pattern);
  cycleArc(svg, CENTER, CENTER, ARC_RADIUS, cycle, 0, greenMin, { stroke: "var(--green)", "stroke-width": 20 });
  cycleArc(svg, CENTER, CENTER, ARC_RADIUS, cycle, greenMin, greenMax, { stroke: "url(#stripes)", "stroke-width": 20 });
  cycleArc(svg, CENTER, CENTER, ARC_RADIUS, cycle, greenMax, cycle - 0.01, { stroke: "var(--red)", "stroke-width": 20 });

  for (const pass of classifiedPasses(crossing, live).passes) {
    const [cx, cy] = pointOnCycle(CENTER, CENTER, RING_RADIUS[pass.category], cycle, pass.position);
    const color = CATEGORY_STYLE[pass.category].color;
    svgEl("circle", { cx, cy, r: 4.2, fill: pass.fixedPrecision ? "var(--surface)" : color, stroke: color, "stroke-width": 1.8 }, svg);
  }

  const hand = svgEl("g", {}, svg);
  svgEl("circle", { cx: CENTER, cy: 26, r: 13, fill: "var(--base)", stroke: "var(--ink)", "stroke-width": 5 }, hand);
  activeClock = { cycle, phase: live.phase, greenMin, greenMax, hand, includes: live.model.includes, lastState: "" };
}

function updateClock({ secondsOfDay, dayType }) {
  const clock = activeClock;
  if (!clock || !document.body.contains(clock.hand)) return;
  const position = cyclePosition(secondsOfDay, clock.cycle, clock.phase);
  const untilGreen = clock.cycle - position;
  clock.hand.setAttribute("transform", `rotate(${(position / clock.cycle) * 360} ${CENTER} ${CENTER})`);

  const [lightState, cls, countdown] = position < clock.greenMin
    ? [enums.lightState.green, "green", t.clock.countdownGreen(Math.ceil(clock.greenMin - position))]
    : position < clock.greenMax
      ? [enums.lightState.changing, "uncertain", t.clock.countdownChanging(Math.ceil(untilGreen))]
      : [enums.lightState.red, "red", t.clock.countdownRed(Math.ceil(untilGreen))];
  const stateEl = $("light-state");
  stateEl.textContent = lightState;
  stateEl.className = `light-state ${cls}`;
  $("countdown").innerHTML = countdown;
  if (clock.lastState !== lightState) {
    $("clock-announcer").textContent = t.clock.announce(lightState);
    clock.lastState = lightState;
  }
  $("upcoming-greens").innerHTML = Array.from({ length: UPCOMING_GREENS }, (_, k) =>
    `<div>${formatTime(secondsOfDay + untilGreen + k * clock.cycle)}</div>`).join("");

  const notice = $("band-notice");
  const message = withinBands(clock.includes, dayType, secondsOfDay) ? "" : t.clock.outsideBand;
  if (notice.dataset.message !== message) {
    notice.innerHTML = message ? `<p class="notice">${message}</p>` : "";
    notice.dataset.message = message;
  }
}

export function initCycleClock() {
  onTick(updateClock);
}
