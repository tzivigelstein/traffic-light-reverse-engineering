import { t } from "../i18n/es.js";
import { $, escapeHtml } from "../lib/dom.js";
import { getRoute } from "../model/dataset.js";
import { refresh, renameRoute } from "../model/state.js";
import { routeName } from "./labels.js";

export const NAME_INPUT_ID = "route-name-input";

/** Replace the route header with an inline name editor. Enter saves, Escape cancels, blur saves. */
export function startRename(routeId) {
  const header = $("route-header"), route = getRoute(routeId);
  header.innerHTML = `<label class="visually-hidden" for="${NAME_INPUT_ID}">${t.route.nameInputLabel}</label><input class="name-input" id="${NAME_INPUT_ID}" value="${escapeHtml(routeName(route))}" maxlength="40">
    <p class="small" style="margin-top:6px">${t.route.nameInputHint}</p>`;
  const input = $(NAME_INPUT_ID);
  input.focus();
  input.select();
  const commit = () => renameRoute(routeId, input.value.trim());
  input.onkeydown = (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") refresh();
  };
  input.onblur = commit;
}

export const isRenaming = () => document.activeElement?.id === NAME_INPUT_ID;
