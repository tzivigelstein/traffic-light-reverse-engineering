import { enums, t } from "../i18n/es.js";
import { $, svgEl } from "../lib/dom.js";
import { cycleArc, pointOnCycle } from "../lib/svg-arc.js";
import { cyclePosition } from "../lib/time.js";
import { onTick } from "../live-clock.js";
import { crossingStatus, cyclePhases, liveModel } from "../model/crossings.js";
import { dataset, getWalk } from "../model/dataset.js";
import { relevantCrossingIds } from "../model/selection.js";
import { isSelected, navigate, state } from "../model/state.js";
import { onViewChange, size, toScreen, view } from "./viewport.js";

/** Crossing markers, stops and the home marker, drawn in screen space on every view change. */

const layer = $("marker-layer");
const LABEL_MIN_SCALE = 0.6;
const RING_RADIUS = 11.5;

/** Live light markers currently on screen, updated every tick. */
let liveMarkers = [];

function drawLiveLight(group, live) {
  const { greenMin, greenMax } = cyclePhases(live);
  const dash = live.provisional ? "3 2.5" : "none";
  svgEl("circle", { r: 16, fill: "var(--surface)", stroke: "var(--ink)", "stroke-width": 1.5, "stroke-dasharray": dash }, group);
  cycleArc(group, 0, 0, RING_RADIUS, live.cycle, 0, greenMin, { stroke: "var(--green)", "stroke-width": 5 });
  cycleArc(group, 0, 0, RING_RADIUS, live.cycle, greenMin, greenMax, { stroke: "var(--amber)", "stroke-width": 5 });
  cycleArc(group, 0, 0, RING_RADIUS, live.cycle, greenMax, live.cycle - 0.01, { stroke: "var(--red)", "stroke-width": 5 });
  const light = svgEl("circle", { r: 5, fill: "var(--ink)" }, group);
  const hand = svgEl("circle", { cx: 0, cy: -RING_RADIUS, r: 3.4, fill: "var(--surface)", stroke: "var(--ink)", "stroke-width": 2 }, group);
  const chip = svgEl("g", { transform: "translate(22 -9)" }, group);
  const chipBackground = svgEl("rect", { x: 0, y: 0, height: 22, width: 90, rx: 11, fill: "var(--surface)", stroke: "var(--line)" }, chip);
  const chipText = svgEl("text", { x: 10, y: 15.5, style: "font: 700 13px var(--sans); fill: var(--ink)" }, chip);
  liveMarkers.push({ cycle: live.cycle, phase: live.phase, greenMin, greenMax, provisional: live.provisional, light, hand, chipText, chipBackground });
}

function updateLiveLights({ secondsOfDay }) {
  for (const m of liveMarkers) {
    const position = cyclePosition(secondsOfDay, m.cycle, m.phase);
    const [hx, hy] = pointOnCycle(0, 0, RING_RADIUS, m.cycle, position);
    m.hand.setAttribute("cx", hx);
    m.hand.setAttribute("cy", hy);
    const [color, text] = position < m.greenMin ? ["var(--green)", t.map.lightGreen(Math.ceil(m.greenMin - position))]
      : position < m.greenMax ? ["var(--amber)", t.map.lightChanging]
      : ["var(--red)", t.map.lightRed(Math.ceil(m.cycle - position))];
    const label = (m.provisional ? t.labels.approx : "") + text;
    m.light.setAttribute("fill", color);
    if (m.chipText.textContent !== label) {
      m.chipText.textContent = label;
      m.chipBackground.setAttribute("width", Math.ceil(m.chipText.getComputedTextLength()) + 20);
    }
  }
}

export function drawMarkers() {
  layer.innerHTML = "";
  liveMarkers = [];
  const { width, height } = size();

  const [hx, hy] = toScreen(0, 0);
  svgEl("rect", { x: hx - 6, y: hy - 6, width: 12, height: 12, rx: 3, class: "home-marker" }, layer);

  if (state.selection?.type === "walk") {
    for (const stop of getWalk(state.selection.id).stops) {
      const [x, y] = toScreen(stop.x, stop.y);
      svgEl("circle", { cx: x, cy: y, r: Math.min(4 + stop.seconds / 6, 12), class: "stop" }, layer);
    }
  }

  const relevant = relevantCrossingIds();
  for (const crossing of dataset.crossings) {
    const [x, y] = toScreen(crossing.x, crossing.y);
    if (x < -20 || y < -20 || x > width + 20 || y > height + 20) continue;
    const status = crossingStatus(crossing);
    const selected = isSelected("crossing", crossing.id);
    const faded = relevant && !relevant.has(crossing.id);
    const group = svgEl("g", {
      class: `crossing-marker ${status}${selected ? " selected" : ""}${faded ? " faded" : ""}`,
      transform: `translate(${x} ${y})`,
      tabindex: 0,
      role: "button",
      "aria-label": t.labels.crossingAria(crossing.id, enums.status[status]),
    }, layer);
    svgEl("circle", { r: 20, class: "hit-area" }, group);
    const live = liveModel(crossing);
    if (live) {
      svgEl("circle", { r: 22, class: "halo" }, group);
      drawLiveLight(group, live);
    } else {
      svgEl("circle", { r: 13, class: "halo" }, group);
      svgEl("circle", { r: 7.5, class: "dot" }, group);
    }
    const open = () => navigate({ type: "crossing", id: crossing.id });
    group.addEventListener("click", (ev) => { ev.stopPropagation(); open(); });
    group.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); open(); } });
    if (!live && (view.scale > LABEL_MIN_SCALE || selected)) {
      svgEl("text", { x: 12, y: -10, class: "map-label" }, group).textContent = t.labels.crossing(crossing.id);
    }
  }
}

export function initMarkers() {
  onViewChange(drawMarkers);
  onTick(updateLiveLights);
}
