import { STORAGE_KEYS } from "../config.js";
import { load, save } from "../lib/storage.js";

const stored = load(STORAGE_KEYS.dataset, null);

/** The dataset produced on this device from the user's Health export, or an empty one until then. */
export const hasData = Boolean(stored?.walks?.length);

/** @type {import("./types.js").Dataset} */
export const dataset = hasData ? stored : { updatedAt: null, origin: null, routes: [], crossings: [], walks: [] };

/** Persist a freshly analysed dataset; the app reloads to rebuild everything from it. */
export function storeDataset(data) {
  save(STORAGE_KEYS.dataset, data);
}

export function clearStoredDataset() {
  try { localStorage.removeItem(STORAGE_KEYS.dataset); } catch { /* ignore */ }
}

export const getRoute = (id) => dataset.routes.find((r) => r.id === id);
export const getCrossing = (id) => dataset.crossings.find((c) => c.id === id);
export const getWalk = (id) => dataset.walks.find((w) => w.id === id);

export const isRepeatedRoute = (route) => route.count >= 2;

/** Walks whose trace goes through the given crossing (any period). */
export const walksThroughCrossing = (crossingId) =>
  dataset.walks.filter((w) => w.crossings.some((x) => x.crossingId === crossingId));

/** Total seconds waited at crossings during a walk. */
export const totalWait = (walk) => walk.crossings.reduce((acc, x) => acc + x.wait, 0);
