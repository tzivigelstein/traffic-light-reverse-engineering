import { REDUCED_MOTION, ZOOM } from "../config.js";
import { $ } from "../lib/dom.js";

/** World (metres, y up) <-> screen (px, y down) transform for the map container. */

const container = $("map");

/** cx/cy: world point at the screen centre; scale: px per metre. */
export let view = { cx: 0, cy: 0, scale: 0.2 };

export const size = () => ({ width: container.clientWidth, height: container.clientHeight });

export function toScreen(x, y) {
  const { width, height } = size();
  return [(x - view.cx) * view.scale + width / 2, -(y - view.cy) * view.scale + height / 2];
}

export function toWorld(px, py) {
  const { width, height } = size();
  return [(px - width / 2) / view.scale + view.cx, -(py - height / 2) / view.scale + view.cy];
}

const listeners = new Set();
/** Subscribe to view changes (pan, zoom, resize). */
export const onViewChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export function setView(next) {
  view = next;
  for (const fn of listeners) fn(view);
}

export const clampScale = (scale) => Math.min(ZOOM.max, Math.max(ZOOM.min, scale));

/** Zoom by factor `f` keeping the screen point (px, py) fixed. */
export function zoomAt(px, py, f) {
  const [wx, wy] = toWorld(px, py);
  const scale = clampScale(view.scale * f);
  const { width, height } = size();
  setView({ scale, cx: wx - (px - width / 2) / scale, cy: wy + (py - height / 2) / scale });
}

export function zoomAtCenter(f) {
  const { width, height } = size();
  zoomAt(width / 2, height / 2, f);
}

/** Frame a set of world points, animating unless disabled. */
export function fitPoints(points, animate = true) {
  if (!points.length) return;
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const { width, height } = size();
  const target = {
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    scale: Math.min(ZOOM.fitMax, Math.max(ZOOM.min,
      Math.min((width - 90) / Math.max(x1 - x0, 60), (height - 110) / Math.max(y1 - y0, 60)))),
  };
  if (!animate || REDUCED_MOTION) { setView(target); return; }
  const from = { ...view }, start = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - start) / 350), e = 1 - (1 - k) ** 3;
    setView({
      cx: from.cx + (target.cx - from.cx) * e,
      cy: from.cy + (target.cy - from.cy) * e,
      scale: from.scale * (target.scale / from.scale) ** e,
    });
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Re-notify on container resize so overlays stay aligned. */
export function observeResize() {
  new ResizeObserver(() => setView(view)).observe(container);
}
