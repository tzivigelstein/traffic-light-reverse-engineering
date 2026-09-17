import { $ } from "../lib/dom.js";
import { goBack, navigate, setListTab, setPeriod, state } from "../model/state.js";
import { crossingView } from "./crossing-view.js";
import { mountCycleClock } from "./cycle-clock.js";
import { listView } from "./list-view.js";
import { startRename } from "./rename.js";
import { routeView } from "./route-view.js";
import { walkView } from "./walk-view.js";

const panel = $("panel");

function viewFor(selection) {
  if (!selection) return listView();
  if (selection.type === "route") return routeView(selection.id);
  if (selection.type === "crossing") return crossingView(selection.id);
  return walkView(selection.id);
}

/** Wire the data-* attributes rendered by the views to state actions. */
function bindEvents() {
  const each = (selector, fn) => panel.querySelectorAll(selector).forEach((el) => { el.onclick = () => fn(el.dataset); });
  each("[data-list-tab]", (d) => setListTab(d.listTab));
  each("[data-period]", (d) => setPeriod(d.period));
  each("[data-route]", (d) => navigate({ type: "route", id: +d.route }));
  each("[data-walk]", (d) => navigate({ type: "walk", id: d.walk }));
  each("[data-crossing]", (d) => navigate({ type: "crossing", id: +d.crossing }));
  each("[data-back]", goBack);
  each("[data-rename]", (d) => startRename(+d.rename));
}

export function renderPanel() {
  panel.innerHTML = viewFor(state.selection);
  panel.scrollTop = 0;
  bindEvents();
  mountCycleClock();
}
