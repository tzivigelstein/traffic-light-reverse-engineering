import { parseGpx } from "./gpx.js";
import { streamZip } from "./zip.js";

/**
 * Read walk recordings from a Health export.zip, a workout-routes.zip or a zip of GPX files.
 * With export.xml present only the routes of walking workouts are kept (unless `onlyWalks` is off).
 * Returns [{ name, points, hAcc }], sorted by name. GPX text is parsed as it streams and dropped.
 */
export async function readSources(file, { onlyWalks = true, onProgress } = {}) {
  const gpx = new Map();      // basename -> parsed
  const inRoutesDir = new Set();
  const walkingRoutes = new Set();
  let hasExportXml = false;

  const baseName = (path) => path.slice(path.lastIndexOf("/") + 1);

  await streamZip(file, (name) => {
    if (name.includes("__MACOSX")) return null;
    if (name.toLowerCase().endsWith(".gpx")) {
      let text = "";
      return {
        text(piece, final) {
          text += piece;
          if (!final) return;
          const base = baseName(name);
          try { gpx.set(base, { name: base, ...parseGpx(text) }); } catch { /* skip broken file */ }
          if (name.includes("workout-routes/")) inRoutesDir.add(base);
          text = "";
        },
      };
    }
    if (name.endsWith("export.xml") && onlyWalks) {
      hasExportXml = true;
      onProgress?.({ stage: "export-xml" });
      return workoutScanner(walkingRoutes);
    }
    return null;
  }, (fraction) => onProgress?.({ stage: "reading", fraction }));

  let names = [...gpx.keys()];
  if (inRoutesDir.size) names = names.filter((n) => inRoutesDir.has(n));
  const total = names.length;
  if (hasExportXml) names = names.filter((n) => walkingRoutes.has(n));
  return { sources: names.sort().map((n) => gpx.get(n)), discarded: total - names.length };
}

/**
 * Streaming scan of export.xml for <Workout workoutActivityType="…Walking"> blocks and the
 * <FileReference path="…"/> of their routes. Works on text pieces of any size.
 */
function workoutScanner(walkingRoutes) {
  let buffer = "";
  const processBlock = (block) => {
    const type = /workoutActivityType="([^"]*)"/.exec(block)?.[1] ?? "";
    if (!type.endsWith("Walking")) return;
    for (const m of block.matchAll(/<FileReference[^>]*path="([^"]*)"/g)) {
      walkingRoutes.add(m[1].slice(m[1].lastIndexOf("/") + 1));
    }
  };
  return {
    text(piece) {
      buffer += piece;
      for (;;) {
        const start = buffer.indexOf("<Workout ");
        if (start < 0) { buffer = buffer.slice(-16); return; }
        const tagEnd = buffer.indexOf(">", start);
        if (tagEnd < 0) { buffer = buffer.slice(start); return; }
        if (buffer[tagEnd - 1] === "/") { buffer = buffer.slice(tagEnd + 1); continue; } // no children
        const end = buffer.indexOf("</Workout>", tagEnd);
        if (end < 0) { buffer = buffer.slice(start); return; }
        processBlock(buffer.slice(start, end));
        buffer = buffer.slice(end + 10);
      }
    },
  };
}
