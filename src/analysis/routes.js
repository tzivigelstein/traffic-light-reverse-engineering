import { dayTypeOf, localSeconds } from "./local-time.js";
import { min } from "./numeric.js";

/**
 * Group walks by route (start and end), day type and departure band: each combination
 * can have a different signal plan and different corners.
 *
 * Mutates each track with `route` (index), `complete` (false when recording started
 * mid-walk) and `dayType`.
 *
 * @typedef {Object} WalkGroup
 * @property {number} route
 * @property {"weekday"|"weekend"} dayType
 * @property {import("./track.js").Track[]} tracks  Sorted by departure time of day
 * @property {number} from   Earliest departure, seconds of day
 * @property {number} to     Latest departure
 */
export function splitGroups(tracks, routeDistance = 150, gap = 45 * 60) {
  const routes = [];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const nearestOnTrack = (track, p) => min(Array.from(track.xs, (x, i) => Math.hypot(x - p[0], track.ys[i] - p[1])));

  for (const track of tracks) {
    const start = [track.xs[0], track.ys[0]], end = [track.xs[track.xs.length - 1], track.ys[track.ys.length - 1]];
    let assigned = false;
    for (let k = 0; k < routes.length && !assigned; k++) {
      const r = routes[k];
      if (dist(end, r.end) >= routeDistance) continue;
      if (dist(start, r.start) < routeDistance) {
        track.route = k; track.complete = true; assigned = true;
      } else if (nearestOnTrack(r.rep, start) < 40 && track.t.length > 0.3 * r.rep.t.length) {
        // you started recording later: your start lies on that route
        track.route = k; track.complete = false; assigned = true;
      } else if (nearestOnTrack(track, r.start) < 40 && r.rep.t.length > 0.3 * track.t.length) {
        // the other way round: the reference was a partial recording and this one is fuller
        for (const other of tracks) {
          if (other.route === k && dist([other.xs[0], other.ys[0]], r.start) < routeDistance) other.complete = false;
        }
        r.start = start; r.rep = track;
        track.route = k; track.complete = true; assigned = true;
      }
    }
    if (!assigned) {
      routes.push({ start, end, rep: track });
      track.route = routes.length - 1;
      track.complete = true;
    }
    track.dayType = dayTypeOf(track.t[0]);
  }

  const groups = [];
  const keys = [...new Set(tracks.map((t) => `${t.route}|${t.dayType}`))].sort();
  for (const key of keys) {
    const [route, dayType] = key.split("|");
    const members = tracks
      .filter((t) => t.route === +route && t.dayType === dayType)
      .sort((a, b) => localSeconds(a.t[0]) - localSeconds(b.t[0]));
    let current = [members[0]];
    const bands = [];
    for (const t of members.slice(1)) {
      if (localSeconds(t.t[0]) - localSeconds(current[current.length - 1].t[0]) > gap) { bands.push(current); current = [t]; }
      else current.push(t);
    }
    bands.push(current);
    for (const band of bands) {
      groups.push({ route: +route, dayType, tracks: band, from: localSeconds(band[0].t[0]), to: localSeconds(band[band.length - 1].t[0]) });
    }
  }
  return groups;
}
