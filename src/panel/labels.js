import { enums, t } from "../i18n/es.js";
import { formatDecimal, formatKm } from "../lib/format.js";
import { state } from "../model/state.js";

/** Display names derived from data + i18n, shared by panel views and the map. */

export const routeName = (route) =>
  state.routeNames[route.id] || t.labels.defaultRouteName(enums.heading[route.heading], formatKm(route.km));

/** "northeast-southwest" -> "noreste-suroeste". */
export const walkingDirection = (direction) => direction.split("-").map((h) => enums.heading[h] ?? h).join("-");

export const statusLabel = (status) => enums.status[status];

/** "días hábiles de 7 a 10 h y fines de semana de 10 a 20 h" */
export function timeBandsText(includes) {
  return t.labels.joinBands(includes.map(([dayType, band]) => {
    const [from, to] = band.split("–");
    return t.labels.timeBand(enums.dayType[dayType], from, to);
  }));
}

export const cycleSeconds = (cycle) => formatDecimal(cycle);
