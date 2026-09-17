import raw from "../data/dataset.json";

/** @type {import("./types.js").Dataset} */
export const dataset = raw;

export const getRoute = (id) => dataset.routes.find((r) => r.id === id);
export const getCrossing = (id) => dataset.crossings.find((c) => c.id === id);
export const getWalk = (id) => dataset.walks.find((w) => w.id === id);

export const isRepeatedRoute = (route) => route.count >= 2;

/** Walks whose trace goes through the given crossing (any period). */
export const walksThroughCrossing = (crossingId) =>
  dataset.walks.filter((w) => w.crossings.some((x) => x.crossingId === crossingId));

/** Total seconds waited at crossings during a walk. */
export const totalWait = (walk) => walk.crossings.reduce((acc, x) => acc + x.wait, 0);
