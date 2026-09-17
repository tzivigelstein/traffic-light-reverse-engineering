import { $ } from "../lib/dom.js";
import { selectionPoints } from "../model/selection.js";
import { initGestures } from "./gestures.js";
import { initMarkers } from "./markers.js";
import { initScaleBar } from "./scale-bar.js";
import { initTiles } from "./tiles.js";
import { initTraces } from "./traces.js";
import { fitPoints, observeResize, zoomAtCenter } from "./viewport.js";

const ZOOM_STEP = 1.6;

export function initMap() {
  initTraces();
  initTiles();
  initMarkers();
  initScaleBar();
  initGestures();
  observeResize();
  $("zoom-in").onclick = () => zoomAtCenter(ZOOM_STEP);
  $("zoom-out").onclick = () => zoomAtCenter(1 / ZOOM_STEP);
  $("fit-selection").onclick = () => fitPoints(selectionPoints());
}

export const fitSelection = (animate = true) => fitPoints(selectionPoints(), animate);
export { styleTraces } from "./traces.js";
export { drawMarkers } from "./markers.js";
