import { t } from "./i18n/es.js";
import { $ } from "./lib/dom.js";
import { formatLongDate, formatMonthShort } from "./lib/format.js";
import { dataset, getRoute, isRepeatedRoute } from "./model/dataset.js";

/** The "Tus datos" dialog: dataset summary and the (not yet functional) import picker. */

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

export function initDataSheet() {
  const dialog = $("data-sheet");
  $("data-button").onclick = () => {
    $("data-summary").innerHTML = summaryRows().map(([label, value]) => `<div>${label}</div><div>${value}</div>`).join("");
    $("data-date").textContent = formatLongDate(dataset.updatedAt);
    dialog.showModal();
  };
  $("close-data-sheet").onclick = () => dialog.close();
  $("import-file").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    $("import-result").textContent = t.dataSheet.filePicked(file.name, (file.size / 1048576).toFixed(1));
  };
  return { isOpen: () => dialog.open };
}
