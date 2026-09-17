import { enums, t } from "../i18n/es.js";
import { formatDecimal, formatKm } from "../lib/format.js";
import { state } from "../model/state.js";

/** Display names derived from data + i18n, shared by panel views and the map. */

export const routeName = (route) =>
  state.routeNames[route.id] || t.labels.defaultRouteName(enums.heading[route.heading], formatKm(route.km));

/** "northeast-southwest" -> "noreste-suroeste". */
export const walkingDirection = (direction) => direction.split("-").map((h) => enums.heading[h] ?? h).join("-");

export const statusLabel = (status) => enums.status[status];

/** "Cruce de Av. Rivadavia" when the map named the street, otherwise "Cruce 3". */
export const crossingName = (crossing) =>
  crossing.street ? t.labels.crossingOnStreet(crossing.street) : t.labels.crossing(crossing.id);

export const crossingKindLabel = (kind) => (kind ? enums.crossingKind[kind] ?? kind : null);

/** "días hábiles de 7 a 10 h y fines de semana de 10 a 20 h" */
export function timeBandsText(includes) {
  return t.labels.joinBands(includes.map(([dayType, band]) => {
    const [from, to] = band.split("–");
    return t.labels.timeBand(enums.dayType[dayType], from, to);
  }));
}

export const cycleSeconds = (cycle) => formatDecimal(cycle);
