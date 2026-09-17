/** App-wide constants. */

/** Time zone the walks were recorded in; the live clock runs in it too. */
export const TIME_ZONE = "America/Argentina/Buenos_Aires";

/** First date with watch recordings; the "since the watch" period filter starts here. */
export const WATCH_SINCE = "2026-08-01";

/** localStorage keys. */
export const STORAGE_KEYS = {
  listTab: "cruce-list-tab",
  period: "cruce-period",
  routeNames: "cruce-route-names",
  dataset: "cruce-dataset",
};

/** Zoom limits for the map view (screen px per metre). */
export const ZOOM = { min: 0.02, max: 6, fitMax: 3 };

export const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Background tile provider: CARTO's basemaps (OpenStreetMap data). They need a free API
 * key (VITE_CARTO_API_KEY in .env.local; without it tiles carry an "API key required" watermark).
 * tile.openstreetmap.org is not an option: its usage policy blocks apps it cannot identify.
 * Placeholders: {s} subdomain, {z}/{x}/{y} tile coords, {r} "@2x" on hi-dpi screens.
 */
const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY ?? "";
export const TILES = {
  url: `https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png${CARTO_API_KEY ? `?key=${CARTO_API_KEY}` : ""}`,
  subdomains: ["a", "b", "c", "d"],
  attribution:
    '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' +
    ' © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
};
