/** Local-metres <-> lat/lon and Web Mercator tile math. */

const EARTH_RADIUS = 6371000;
const RAD = Math.PI / 180;

/** Ground resolution at zoom 0 (metres per pixel at the equator). */
const ZOOM0_RESOLUTION = 156543.03;

export function metresToLatLon(origin, x, y) {
  return [origin.lat + y / EARTH_RADIUS / RAD, origin.lon + x / (EARTH_RADIUS * Math.cos(origin.lat * RAD)) / RAD];
}

export function latLonToMetres(origin, lat, lon) {
  return [(lon - origin.lon) * RAD * EARTH_RADIUS * Math.cos(origin.lat * RAD), (lat - origin.lat) * RAD * EARTH_RADIUS];
}

export const lonToTileX = (lon, z) => ((lon + 180) / 360) * 2 ** z;
export const latToTileY = (lat, z) =>
  ((1 - Math.log(Math.tan(lat * RAD) + 1 / Math.cos(lat * RAD)) / Math.PI) / 2) * 2 ** z;
export const tileXToLon = (x, z) => (x / 2 ** z) * 360 - 180;
export function tileYToLat(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return Math.atan(Math.sinh(n)) / RAD;
}

/** Tile zoom level whose resolution best matches `scale` screen px per metre at `lat`. */
export function zoomForScale(lat, scale) {
  return Math.max(3, Math.min(19, Math.round(Math.log2(ZOOM0_RESOLUTION * Math.cos(lat * RAD) * scale))));
}
