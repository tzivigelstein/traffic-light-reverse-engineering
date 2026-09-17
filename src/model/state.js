import { STORAGE_KEYS } from "../config.js";
import { load, save } from "../lib/storage.js";

/**
 * @typedef {{type: "route", id: number} | {type: "crossing", id: number} | {type: "walk", id: string}} Selection
 */

export const state = {
  /** @type {Selection|null} */
  selection: null,
  /** @type {"routes"|"crossings"} */
  listTab: load(STORAGE_KEYS.listTab, "routes"),
  /** @type {"all"|"watch"} */
  period: load(STORAGE_KEYS.period, "all"),
  /** @type {Record<number, string>} user-given route names ("cruce-nombres" was the single-file prototype's key) */
  routeNames: load(STORAGE_KEYS.routeNames, load("cruce-nombres", {})),
  /** @type {Selection[]} back stack */
  history: [],
};

const listeners = new Set();

/** Subscribe to state changes. The callback gets `{ refit }`: whether the map should re-frame the selection. */
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (refit) => listeners.forEach((fn) => fn({ refit }));

/** Open a selection (or the top-level list with `null`). */
export function navigate(selection, { push = true } = {}) {
  if (push && state.selection) state.history.push(state.selection);
  if (!selection) state.history = [];
  state.selection = selection;
  emit(true);
}

export function goBack() {
  navigate(state.history.pop() || null, { push: false });
}

export function setListTab(tab) {
  state.listTab = tab;
  save(STORAGE_KEYS.listTab, tab);
  emit(false);
}

export function setPeriod(period) {
  state.period = period;
  save(STORAGE_KEYS.period, period);
  emit(true);
}

/** Set a custom route name; an empty name restores the automatic one. */
export function renameRoute(routeId, name) {
  if (name) state.routeNames[routeId] = name;
  else delete state.routeNames[routeId];
  save(STORAGE_KEYS.routeNames, state.routeNames);
  emit(false);
}

/** Re-render without changing state (e.g. cancelling an inline edit). */
export const refresh = () => emit(false);

export const isSelected = (type, id) => state.selection?.type === type && state.selection.id === id;
