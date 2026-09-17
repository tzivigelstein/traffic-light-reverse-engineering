/**
 * Minimal GPX reader: track points with a timestamp, plus the horizontal accuracy Apple
 * Health writes in each point's <extensions> (used to spot fixed-precision recordings).
 * Regex-based on purpose: Health GPX is regular, files are large, and this keeps the
 * parser usable in a worker or in Node without a DOM.
 */
const POINT = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/g;
const ATTR = (name, attrs) => new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1];

export function parseGpx(text) {
  const points = [], hAcc = [];
  for (const m of text.matchAll(POINT)) {
    const attrs = m[1], body = m[2];
    const time = /<time>([^<]*)<\/time>/.exec(body)?.[1];
    if (!time) continue;
    const t = Date.parse(time) / 1000;
    if (!Number.isFinite(t)) continue;
    points.push({ t, lat: +ATTR("lat", attrs), lon: +ATTR("lon", attrs) });
    const acc = /<(?:[\w-]+:)?hAcc>([^<]*)<\/(?:[\w-]+:)?hAcc>/.exec(body)?.[1];
    if (acc) hAcc.push(+acc);
  }
  return { points, hAcc };
}
