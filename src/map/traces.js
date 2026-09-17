import { $, svgEl } from "../lib/dom.js";
import { dataset } from "../model/dataset.js";
import { visibleWalks } from "../model/routes.js";
import { traceEmphasis } from "../model/selection.js";
import { onViewChange, size } from "./viewport.js";

/** Walk traces live in world coordinates; the layer transform does the projection. */

const layer = $("trace-layer");
/** @type {Map<string, SVGPathElement>} walk id -> path */
const paths = new Map();

export function initTraces() {
  layer.innerHTML = "";
  for (const walk of dataset.walks) {
    const d = "M" + walk.points.map((p) => p.join(" ")).join("L");
    paths.set(walk.id, svgEl("path", { d, class: "trace" }, layer));
  }
  onViewChange((view) => {
    const { width, height } = size();
    layer.setAttribute("transform",
      `matrix(${view.scale} 0 0 ${-view.scale} ${width / 2 - view.cx * view.scale} ${height / 2 + view.cy * view.scale})`);
  });
}

/** Show/hide/emphasise traces according to the period filter and selection. */
export function styleTraces() {
  const visible = new Set(visibleWalks().map((w) => w.id));
  const { highlighted, solo } = traceEmphasis();
  layer.querySelectorAll(".trace-outline").forEach((el) => el.remove());
  for (const [id, path] of paths) {
    if (!visible.has(id)) { path.style.display = "none"; continue; }
    path.style.display = "";
    let cls = "trace";
    if (solo) cls += id === solo ? " solo" : " dimmed";
    else if (highlighted) cls += highlighted.has(id) ? " highlighted" : " dimmed";
    path.setAttribute("class", cls);
    if (id === solo || highlighted?.has(id)) layer.appendChild(path); // bring to front
  }
  if (solo) {
    const path = paths.get(solo), outline = path.cloneNode();
    outline.setAttribute("class", "trace-outline");
    layer.insertBefore(outline, path);
  }
}
