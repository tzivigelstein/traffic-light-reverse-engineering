import { $ } from "../lib/dom.js";
import { formatDistance } from "../lib/format.js";
import { onViewChange } from "./viewport.js";

const OPTIONS = [20, 50, 100, 200, 500, 1000, 2000, 5000];

export function initScaleBar() {
  const bar = $("scale-bar");
  const line = bar.querySelector("i"), label = bar.querySelector("span");
  onViewChange((view) => {
    const metres = OPTIONS.find((m) => m * view.scale >= 60) || OPTIONS.at(-1);
    line.style.width = `${metres * view.scale}px`;
    label.textContent = formatDistance(metres);
  });
}
