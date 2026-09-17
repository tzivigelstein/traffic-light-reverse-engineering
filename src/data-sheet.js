import { analyzeInWorker } from "./analysis/index.js";
import { t } from "./i18n/es.js";
import { $ } from "./lib/dom.js";
import { formatLongDate, formatMonthShort } from "./lib/format.js";
import { clearStoredDataset, dataset, getRoute, hasData, isRepeatedRoute, storeDataset } from "./model/dataset.js";

/** The "Tus datos" dialog: Health export import, dataset summary, and clearing the device. */

function summaryRows() {
  const walks = dataset.walks;
  const firstMonth = walks.map((w) => w.date).sort()[0];
  return [
    [t.dataSheet.walksWithRoute, walks.length],
    [t.dataSheet.repeatedRoutes, dataset.routes.filter(isRepeatedRoute).length],
    [t.dataSheet.looseWalks, walks.filter((w) => !isRepeatedRoute(getRoute(w.routeId))).length],
    [t.dataSheet.fixedPrecisionRecordings, walks.filter((w) => w.fixedPrecision).length],
    [t.dataSheet.detectedCrossings, dataset.crossings.length],
    [t.dataSheet.period, t.dataSheet.periodValue(formatMonthShort(firstMonth), formatMonthShort(dataset.updatedAt), dataset.updatedAt.slice(0, 4))],
  ];
}

function progressText(event) {
  const p = t.dataSheet.progress;
  switch (event.stage) {
    case "reading": return p.reading(Math.round(event.fraction * 100));
    case "tracks": return p.tracks(event.found, event.done, event.discarded);
    case "models": return p.models(event.done, event.crossings);
    default: return typeof p[event.stage] === "function" ? p[event.stage]() : p[event.stage] ?? "";
  }
}

export function initDataSheet() {
  const dialog = $("data-sheet"), result = $("import-result"), input = $("import-file");
  let busy = false;

  $("data-button").onclick = () => {
    $("data-summary").innerHTML = hasData ? summaryRows().map(([label, value]) => `<div>${label}</div><div>${value}</div>`).join("") : "";
    $("data-note").textContent = hasData ? t.dataSheet.dataNote(formatLongDate(dataset.updatedAt)) : "";
    $("clear-dataset").hidden = !hasData;
    dialog.showModal();
  };
  $("close-data-sheet").onclick = () => { if (!busy) dialog.close(); };
  $("clear-dataset").onclick = () => { clearStoredDataset(); location.reload(); };

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file || busy) return;
    busy = true;
    input.disabled = true;
    result.textContent = t.dataSheet.filePicked(file.name, (file.size / 1048576).toFixed(1));
    let osmWarning = "";
    try {
      const { dataset: fresh, walks, crossings } = await analyzeInWorker(file, {}, (event) => {
        if (event.stage === "osm-failed") osmWarning = ` ${t.dataSheet.progress["osm-failed"]}`;
        result.textContent = progressText(event) + osmWarning;
      });
      storeDataset(fresh);
      result.textContent = t.dataSheet.done(walks, crossings);
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      const known = t.dataSheet.errors[err.message];
      result.textContent = known ?? t.dataSheet.errors.generic(err.message);
      busy = false;
      input.disabled = false;
      input.value = "";
    }
  };
  return { isOpen: () => dialog.open };
}
