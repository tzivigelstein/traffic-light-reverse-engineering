/** Hour bands the analysis splits each day into; a crossing can run a different plan in each. */
export const TIME_BANDS = {
  weekday: [[0, 7], [7, 10], [10, 16], [16, 20], [20, 24]],
  weekend: [[0, 10], [10, 20], [20, 24]],
};

export const BAND_SEPARATOR = "–";

export const bandKey = (dayType, [from, to]) => `${dayType}|${from}${BAND_SEPARATOR}${to}`;

/** Band a given time of day falls into, as "7–10". */
export function bandFor(dayType, secondsOfDay) {
  const hour = secondsOfDay / 3600;
  const band = TIME_BANDS[dayType].find(([from, to]) => hour >= from && hour < to);
  return band ? bandKey(dayType, band) : null;
}

export const parseBand = (text) => text.split(BAND_SEPARATOR).map(Number);

/** True when `secondsOfDay` on a `dayType` day falls inside any of the model's merged bands. */
export function withinBands(includes, dayType, secondsOfDay) {
  const hour = secondsOfDay / 3600;
  return includes.some(([type, band]) => {
    const [from, to] = parseBand(band);
    return type === dayType && hour >= from && hour < to;
  });
}
