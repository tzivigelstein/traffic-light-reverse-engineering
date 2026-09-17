import "./styles/index.css";
import { initDataSheet } from "./data-sheet.js";
import { startLiveClock } from "./live-clock.js";
import { drawMarkers, fitSelection, initMap, styleTraces } from "./map/map.js";
import { goBack, onChange, state } from "./model/state.js";
import { initCycleClock } from "./panel/cycle-clock.js";
import { renderPanel } from "./panel/panel.js";
import { isRenaming } from "./panel/rename.js";

initMap();
initCycleClock();
const dataSheet = initDataSheet();

onChange(({ refit }) => {
  styleTraces();
  renderPanel();
  if (refit) fitSelection();
  else drawMarkers();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && state.selection && !dataSheet.isOpen() && !isRenaming()) goBack();
});

styleTraces();
renderPanel();
requestAnimationFrame(() => fitSelection(false));
startLiveClock();
