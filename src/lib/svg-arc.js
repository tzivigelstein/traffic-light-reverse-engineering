import { svgEl } from "./dom.js";

/** Point on a circle for time `t` of a `cycle`, starting at 12 o'clock and going clockwise. */
export function pointOnCycle(cx, cy, r, cycle, t) {
  const angle = (t / cycle) * 2 * Math.PI - Math.PI / 2;
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

/** Append an arc path spanning [from, to] seconds of a `cycle`. */
export function cycleArc(parent, cx, cy, r, cycle, from, to, attrs) {
  const [x0, y0] = pointOnCycle(cx, cy, r, cycle, from);
  const [x1, y1] = pointOnCycle(cx, cy, r, cycle, to);
  const largeArc = to - from > cycle / 2 ? 1 : 0;
  return svgEl("path", { d: `M${x0} ${y0} A${r} ${r} 0 ${largeArc} 1 ${x1} ${y1}`, fill: "none", ...attrs }, parent);
}
