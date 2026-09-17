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
};

/** Zoom limits for the map view (screen px per metre). */
export const ZOOM = { min: 0.02, max: 6, fitMax: 3 };

export const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Background tile provider. tile.openstreetmap.org blocks apps it cannot identify
 * (its usage policy is for known referers only), so we use CARTO's free basemaps:
 * no API key, allowed for non-commercial use with attribution.
 * Placeholders: {s} subdomain, {z}/{x}/{y} tile coords, {r} "@2x" on hi-dpi screens.
 */
export const TILES = {
  url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  subdomains: ["a", "b", "c", "d"],
  attribution:
    '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' +
    ' © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
};
