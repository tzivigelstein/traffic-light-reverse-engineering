import { idbGet, idbSet } from "../lib/idb.js";
import { analyze } from "./analyze.js";
import { DEFAULTS, TZ_OFFSET } from "./constants.js";
import { buildDataset } from "./export.js";
import { boundsContain, fetchOsm, paddedBounds, prepareOsm } from "./osm.js";
import { readSources } from "./sources.js";
import { loadTrack } from "./track.js";

const OSM_CACHE_KEY = "osm-cache";

/**
 * Full pipeline: zip -> tracks -> (OpenStreetMap) -> analysis -> app dataset.
 *
 * @param {File} file  export.zip, workout-routes.zip or a zip of GPX files
 * @param {object} options
 * @param {boolean} [options.onlyWalks=true]   With export.xml, keep walking workouts only
 * @param {string}  [options.sinceDate]        "YYYY-MM-DD": ignore earlier walks
 * @param {number}  [options.lastDays]         Keep only the last N days
 * @param {(event: {stage: string, [k: string]: any}) => void} [progress]
 */
export async function runAnalysis(file, options = {}, progress = () => {}) {
  const opts = { onlyWalks: true, ...DEFAULTS, ...options };
  const { sources, discarded } = await readSources(file, { onlyWalks: opts.onlyWalks, onProgress: progress });
  if (!sources.length) throw new Error("no-gpx");
  progress({ stage: "tracks", found: sources.length, discarded });

  const first = sources[0].points[0];
  const lat0 = first.lat, lon0 = first.lon;
  let tracks = [];
  sources.forEach((src, i) => {
    const track = loadTrack(src, lat0, lon0);
    if (track) tracks.push(track);
    if (i % 10 === 9) progress({ stage: "tracks", found: sources.length, done: i + 1 });
  });
  if (opts.sinceDate) {
    const [y, m, d] = opts.sinceDate.split("-").map(Number);
    const from = Date.UTC(y, m - 1, d) / 1000 - TZ_OFFSET;
    tracks = tracks.filter((t) => t.t[0] >= from);
  }
  if (opts.lastDays) {
    const limit = Math.max(...tracks.map((t) => t.t[0])) - opts.lastDays * 86400;
    tracks = tracks.filter((t) => t.t[0] >= limit);
  }
  if (!tracks.length) throw new Error("no-tracks");
  progress({ stage: "tracks", found: sources.length, done: sources.length, kept: tracks.length });

  let osm = null, osmError = null;
  try {
    osm = prepareOsm(await loadOsm(tracks, progress), lat0, lon0);
  } catch (err) {
    osmError = String(err?.message ?? err);   // keep going without street names
    progress({ stage: "osm-failed", error: osmError });
  }

  const results = analyze(tracks, osm, opts, (stage, detail) => progress({ stage, ...detail }));
  progress({ stage: "export" });
  const dataset = buildDataset(tracks, results, lat0, lon0);
  return { dataset, osmError, walks: tracks.length, crossings: results.crossings.length };
}

/** Overpass response for the walks' area, cached in IndexedDB while the area still fits. */
async function loadOsm(tracks, progress) {
  const lats = tracks.flatMap((t) => t.lat), lons = tracks.flatMap((t) => t.lon);
  const bounds = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  const cached = await idbGet(OSM_CACHE_KEY);
  if (cached?.bounds && boundsContain(cached.bounds, bounds)) return cached.json;
  progress({ stage: "osm" });
  const json = await fetchOsm(bounds);
  await idbSet(OSM_CACHE_KEY, { bounds: paddedBounds(bounds), json });
  return json;
}
