/**
 * Tunables of the analysis. Ported from the offline Python script; the comments
 * keep the reasoning behind each threshold.
 */

/** Argentina, no daylight saving. Timestamps are shifted by this to get local time. */
export const TZ_OFFSET = -3 * 3600;

export const STILL_SPEED = 0.5;        // m/s: below this you are standing
export const MIN_WAIT = 6;             // s
export const MAX_WAIT = 150;           // s: longer than this is not traffic (a kiosk, a chat...)
export const GROUP_RADIUS = 15;        // m to group waits at the same spot
export const POINT_RADIUS = 20;        // m to attach a pass to a spot
export const MIN_DELAY = 10;           // s lost at a corner to count it as a wait
export const CAR_SPEED = 8.3;          // m/s (30 km/h) to estimate platoon delays
export const INTERSECTION_RADIUS = 40; // m: waits on opposite corners of the same crossing
export const EARTH_RADIUS = 6371000;

/** Candidate cycle lengths, in seconds. */
export const CYCLES = Array.from({ length: Math.round((180 - 40) / 0.25) + 1 }, (_, i) => 40 + i * 0.25);

/** OSM highway ranks, to pick the "main" street at a signal. */
export const ROAD_RANK = {
  motorway: 7, trunk: 6, primary: 5, secondary: 4, tertiary: 3, unclassified: 2, residential: 1, living_street: 0,
};

/** Defaults the Python CLI exposed as flags. */
export const DEFAULTS = {
  margin: 4,          // s of slack when recommending departure times
  headway: 2.5,       // s between cars of a platoon
  minGroup: 12,       // walks needed to call a route "frequent"
};
