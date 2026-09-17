import { enums, t } from "../i18n/es.js";
import { formatMonthShort } from "../lib/format.js";
import { totalWait } from "../model/dataset.js";

/** Per-walk duration dots over time, with amber ticks for time spent waiting at crossings. */
export function durationsChart(walks) {
  const series = walks.filter((w) => w.complete).sort((a, b) => (a.date + a.departure).localeCompare(b.date + b.departure));
  if (series.length < 3) return "";
  const W = 360, H = 170, L = 30, R = 6, T = 10, B = 26;
  const minutes = series.map((w) => w.duration / 60);
  const lo = Math.floor(Math.min(...minutes) - 1), hi = Math.ceil(Math.max(...minutes) + 1);
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const x = (i) => L + (i + 0.5) * ((W - L - R) / series.length);
  const slot = (W - L - R) / series.length;

  let svg = "";
  const step = Math.max(1, Math.round((hi - lo) / 4));
  for (let v = Math.ceil(lo); v <= hi; v += step) {
    svg += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 5}" y="${y(v) + 4}" text-anchor="end">${v}'</text>`;
  }
  let previousMonth = "", lastLabelX = -99;
  series.forEach((walk, i) => {
    const month = walk.date.slice(0, 7);
    if (month !== previousMonth) {
      if (previousMonth) svg += `<line x1="${x(i) - slot / 2}" x2="${x(i) - slot / 2}" y1="${T}" y2="${H - B + 4}" stroke="var(--ink-3)" stroke-dasharray="2 3"/>`;
      if (x(i) - lastLabelX > 28) { svg += `<text x="${x(i) - 3}" y="${H - 8}">${formatMonthShort(month)}</text>`; lastLabelX = x(i); }
      previousMonth = month;
    }
    const cy = y(walk.duration / 60);
    const fill = walk.fixedPrecision ? "var(--surface)" : "var(--ink)";
    const stroke = walk.fixedPrecision ? "var(--ink-3)" : "var(--ink)";
    svg += `<circle cx="${x(i)}" cy="${cy}" r="3.6" fill="${fill}" stroke="${stroke}" stroke-width="1.6"><title>${t.charts.pointTitle(walk.date, (walk.duration / 60).toFixed(1))}</title></circle>`;
    const waited = totalWait(walk);
    if (waited > 0) svg += `<line x1="${x(i)}" x2="${x(i)}" y1="${cy + 6}" y2="${cy + 6 + Math.min(waited, 60) / 3}" stroke="var(--amber)" stroke-width="2.4" stroke-linecap="round"/>`;
  });

  return `<div class="card"><h3>${t.charts.durationsTitle}</h3>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t.charts.durationsAria}">${svg}</svg>
    <div class="legend"><span><i style="background:var(--ink)"></i>${t.charts.normalRecording}</span><span><i style="border:2px solid var(--ink-3)"></i>${t.charts.fixedPrecisionRecording}</span><span><i style="background:var(--amber);border-radius:2px;width:3px;height:11px"></i>${t.charts.crossingWaits}</span></div></div>`;
}

/** Departure-hour histograms, one row for weekdays and one for weekends. */
export function departuresChart(walks) {
  const row = (list, name) => {
    if (!list.length) return "";
    const counts = Array(24).fill(0);
    list.forEach((w) => counts[Math.floor(w.departure / 3600)]++);
    const max = Math.max(...counts);
    const first = counts.findIndex((v) => v), last = 23 - [...counts].reverse().findIndex((v) => v);
    const from = Math.max(0, first - 1), to = Math.min(23, last + 1);
    let bars = "";
    for (let h = from; h <= to; h++) {
      bars += `<div><div class="bar${counts[h] ? " filled" : ""}" style="height:${Math.max(2, (counts[h] / max) * 46)}px"></div><span>${h}</span></div>`;
    }
    return `<p class="small" style="margin-top:8px">${t.charts.departuresRow(name, list.length)}</p><div class="hour-bars">${bars}</div>`;
  };
  const weekdays = walks.filter((w) => w.weekday < 5), weekends = walks.filter((w) => w.weekday >= 5);
  return `<div class="card"><h3>${t.charts.departuresTitle}</h3>${row(weekdays, enums.dayTypeTitle.weekday)}${row(weekends, enums.dayTypeTitle.weekend)}</div>`;
}
