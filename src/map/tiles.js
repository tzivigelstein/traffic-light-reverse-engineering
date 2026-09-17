import { $ } from "../lib/dom.js";
import { latLonToMetres, latToTileY, lonToTileX, metresToLatLon, tileXToLon, tileYToLat, zoomForScale } from "../lib/geo.js";
import { dataset } from "../model/dataset.js";
import { TILES } from "../config.js";
import { onViewChange, size, toScreen, toWorld } from "./viewport.js";

/** Background map tiles (provider in config). Only enabled when the dataset carries a real origin. */

const RETINA = devicePixelRatio > 1 ? "@2x" : "";

function tileUrl(z, x, y) {
  return TILES.url
    .replace("{s}", TILES.subdomains[(x + y) % TILES.subdomains.length])
    .replace("{z}", z).replace("{x}", x).replace("{y}", y).replace("{r}", RETINA);
}
const MAX_TILES_PER_VIEW = 120;
const MAX_CACHE = 400;
const MAX_FAILURES = 6;

const cache = new Map();
let active = false;
let failures = 0;

function disable(layer) {
  active = false;
  layer.hidden = true;
  $("attribution").hidden = true;
}

function draw(view) {
  if (!active) return;
  const layer = $("tiles");
  const origin = dataset.origin;
  const { width, height } = size();
  const z = zoomForScale(origin.lat, view.scale);
  const [lat0, lon0] = metresToLatLon(origin, ...toWorld(0, 0));
  const [lat1, lon1] = metresToLatLon(origin, ...toWorld(width, height));
  const x0 = Math.floor(lonToTileX(lon0, z)), x1 = Math.floor(lonToTileX(lon1, z));
  const y0 = Math.floor(latToTileY(lat0, z)), y1 = Math.floor(latToTileY(lat1, z));
  if ((x1 - x0 + 1) * (y1 - y0 + 1) > MAX_TILES_PER_VIEW) return;

  const used = new Set();
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = y0; ty <= y1; ty++) {
      const key = `${z}/${tx}/${ty}`;
      used.add(key);
      let img = cache.get(key);
      if (!img) {
        img = new Image();
        img.alt = "";
        img.decoding = "async";
        img.dataset.key = key;
        img.onerror = () => { if (++failures > MAX_FAILURES) disable(layer); };
        img.src = tileUrl(z, tx, ty);
        cache.set(key, img);
      }
      const [ax, ay] = toScreen(...latLonToMetres(origin, tileYToLat(ty, z), tileXToLon(tx, z)));
      const [bx, by] = toScreen(...latLonToMetres(origin, tileYToLat(ty + 1, z), tileXToLon(tx + 1, z)));
      Object.assign(img.style, {
        left: `${Math.floor(ax)}px`,
        top: `${Math.floor(ay)}px`,
        width: `${Math.ceil(bx) - Math.floor(ax) + 1}px`,
        height: `${Math.ceil(by) - Math.floor(ay) + 1}px`,
      });
      if (img.parentNode !== layer) layer.appendChild(img);
    }
  }
  for (const img of [...layer.children]) if (!used.has(img.dataset.key)) img.remove();
  if (cache.size > MAX_CACHE) cache.clear();
}

export function initTiles() {
  if (!dataset.origin) return;
  active = true;
  $("tiles").hidden = false;
  const attribution = $("attribution");
  attribution.innerHTML = TILES.attribution;
  attribution.hidden = false;
  onViewChange(draw);
}
