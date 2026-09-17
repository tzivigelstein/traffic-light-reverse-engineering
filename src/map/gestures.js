import { $ } from "../lib/dom.js";
import { clampScale, setView, size, toWorld, view, zoomAt } from "./viewport.js";

/** Drag to pan, wheel to zoom, two-finger pinch. */

const WHEEL_SENSITIVITY = 0.0015;
const DRAG_THRESHOLD_PX = 4;

export function initGestures() {
  const container = $("map");
  const pointers = new Map();
  let gesture = null;

  const startPan = (e) => ({ type: "pan", x: e.clientX, y: e.clientY, from: { ...view } });

  container.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".map-controls, .crossing-marker")) return;
    container.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, [e.offsetX, e.offsetY]);
    if (pointers.size === 1) gesture = startPan(e);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      gesture = {
        type: "pinch",
        distance: Math.hypot(a[0] - b[0], a[1] - b[1]),
        from: { ...view },
        anchor: toWorld((a[0] + b[0]) / 2, (a[1] + b[1]) / 2),
      };
    }
  });

  container.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, [e.offsetX, e.offsetY]);
    if (gesture?.type === "pan" && pointers.size === 1) {
      const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
      if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD_PX) gesture.moved = true;
      setView({ ...gesture.from, cx: gesture.from.cx - dx / gesture.from.scale, cy: gesture.from.cy + dy / gesture.from.scale });
    } else if (gesture?.type === "pinch" && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const scale = clampScale(gesture.from.scale * Math.hypot(a[0] - b[0], a[1] - b[1]) / gesture.distance);
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const { width, height } = size();
      setView({ scale, cx: gesture.anchor[0] - (mx - width / 2) / scale, cy: gesture.anchor[1] + (my - height / 2) / scale });
    }
  });

  const release = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size === 0) gesture = null;
    else if (pointers.size === 1) gesture = startPan(e);
  };
  container.addEventListener("pointerup", release);
  container.addEventListener("pointercancel", release);

  container.addEventListener("wheel", (e) => {
    e.preventDefault();
    zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * WHEEL_SENSITIVITY));
  }, { passive: false });
}
