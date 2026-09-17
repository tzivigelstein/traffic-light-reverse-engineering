import { DEFAULTS } from "./constants.js";
import { addSignalsWithoutWaits, crossingEvent, detectCrossings, placeData } from "./crossings.js";
import { chanceProbability, jointCycle, missingWaits, modelStatus, planChange, platoonStats, searchCycle, sharpRelease } from "./cycle.js";
import { bandIndex, bandOf, localIsoDate, localSeconds } from "./local-time.js";
import { emptyLabel, labelCrossing, lanes } from "./osm.js";
import { median, mod, std } from "./numeric.js";
import { recommend } from "./recommend.js";
import { splitGroups } from "./routes.js";

const STATUS_RANK = ["observing", "probable", "confirmed"];
const higherStatus = (a, b) => (STATUS_RANK.indexOf(a) >= STATUS_RANK.indexOf(b) ? a : b);
const bandKey = (dayType, band) => `${dayType}|${band}`;

/**
 * Whole pipeline after tracks are loaded: crossings, one model per crossing and band,
 * coordinated cycles, merged bands, and departure recommendations per frequent route.
 *
 * @param {import("./track.js").Track[]} tracks
 * @param {{streets: object[], signals: [number, number][]}|null} osm
 * @param {object} options  { headway, margin, minGroup }
 * @param {(stage: string, detail?: object) => void} [progress]
 */
export function analyze(tracks, osm, options = {}, progress = () => {}) {
  const opts = { ...DEFAULTS, ...options };
  const streets = osm?.streets ?? [], signals = osm?.signals ?? [];
  const lastTs = Math.max(...tracks.map((t) => t.t[0]));

  progress("crossings");
  const crossings = detectCrossings(tracks);
  if (signals.length) addSignalsWithoutWaits(crossings, tracks, signals);
  for (const c of crossings) c.info = streets.length ? labelCrossing(c, streets, signals) : emptyLabel();

  const groups = splitGroups(tracks);
  const frequent = new Set(groups.filter((g) => g.tracks.length >= opts.minGroup));

  // ---- events of every walk at every crossing
  for (const c of crossings) c.events = tracks.map((t) => crossingEvent(t, c)).filter(Boolean);
  const live = crossings.filter((c) => c.events.length);
  progress("models", { crossings: live.length });

  // ---- one model per crossing and band
  const keys = [...new Set(live.flatMap((c) => c.events.map((e) => bandKey(e.dayType, e.band))))].sort();
  live.forEach((c, i) => {
    c.models = new Map();
    for (const key of keys) {
      const events = c.events.filter((e) => bandKey(e.dayType, e.band) === key);
      if (!events.length) continue;
      const d = placeData(events);
      const m = d.te.length >= 2 ? searchCycle(d) : null;
      c.models.set(key, { key, events, d, m, status: modelStatus(m, d), includes: [key] });
    }
    progress("models", { crossings: live.length, done: i + 1 });
  });

  // ---- common cycle per band (coordinated crossings)
  progress("coordination");
  for (const key of keys) {
    const confirmed = live.filter((c) => c.models.get(key)?.status === "confirmed");
    if (!confirmed.length) continue;
    const datas = confirmed.map((c) => c.models.get(key).d);
    const C1 = confirmed.length === 1 ? confirmed[0].models.get(key).m.C : jointCycle(datas, datas.map((_, i) => i))[0];
    if (!C1) continue;
    for (const c of live) {
      const md = c.models.get(key);
      // a "probable" with another cycle, in a band with a common cycle, does not hold
      if (md?.status === "probable" && md.m && Math.abs(md.m.C - C1) > 1) md.status = "observing";
    }
    for (const c of live) {
      const md = c.models.get(key);
      if (!md) continue;
      const mc = searchCycle(md.d, [C1]);
      if (mc && mc.score > 0) {
        const status = modelStatus(mc, md.d, true);
        if (md.status === "confirmed" || status !== "observing") {
          md.m = mc;
          md.status = higherStatus(status, md.status);
        }
      }
    }
  }

  // ---- merge bands that share a plan (same phase and cycle)
  for (const c of live) {
    const ordered = [...c.models.values()].sort((a, b) => STATUS_RANK.indexOf(b.status) - STATUS_RANK.indexOf(a.status) || b.d.n - a.d.n);
    for (const md of ordered) {
      if (md.mergedInto || md.status !== "confirmed") continue;
      for (const md2 of c.models.values()) {
        if (md2 === md || md2.mergedInto || md2.key.split("|")[0] !== md.key.split("|")[0]) continue;
        if (!md2.d.te.length) continue;
        const m2 = searchCycle(md2.d, [md.m.C]);
        if (!m2) continue;
        const dPhase = Math.abs(mod(m2.phase - md.m.phase + m2.C / 2, m2.C) - m2.C / 2);
        if (dPhase <= 5 && chanceProbability(m2, md2.d) < 0.05 && sharpRelease(m2, md2.d)) {
          const events = [...md.events, ...md2.events];
          const d = placeData(events);
          const mu = searchCycle(d, [md.m.C]);
          if (mu) {
            Object.assign(md, { events, d, m: mu, status: modelStatus(mu, d, true) });
            md.includes.push(md2.key);
            md2.mergedInto = md.key;
          }
        }
      }
    }
  }

  // ---- per-crossing results
  progress("report");
  const results = [];
  const byPasses = [...live.keys()].sort((a, b) => live[b].events.length - live[a].events.length);
  for (const k of byPasses) {
    const c = live[k], info = c.info;
    const kind = info.ownSignal || c.origin === "osm" ? "signal" : streets.length ? "no-signal" : null;
    const result = {
      id: k, x: c.x, y: c.y, axis: c.axis, passes: c.events.length, kind,
      street: info.crosses?.name ?? null,
      sources: info.sources.map((s) => ({ street: s.street, distance: s.distance })),
      models: [],
      detected: c,
    };
    const modelKeys = [...c.models.keys()].sort((a, b) => {
      const [da, ba] = a.split("|"), [db, bb] = b.split("|");
      return da.localeCompare(db) || bandIndex(da, ba) - bandIndex(db, bb);
    });
    for (const key of modelKeys) {
      const md = c.models.get(key);
      if (md.mergedInto) continue;
      const { d, m, status } = md;
      const [dayType, band] = key.split("|");
      const model = {
        dayType, timeBand: band, includes: md.includes.map((k2) => k2.split("|")),
        status, passes: d.n, waits: d.te.length, inferred: md.events.filter((e) => e.inferred).length,
      };
      if (status === "observing") {
        model.missing = missingWaits(m, d);
        if (m && !Number.isNaN(m.aligned) && m.aligned >= 0.5 && m.score > 0) {
          // best fit so far: good enough to show, not to assert
          model.provisional = { cycle: round(m.C, 2), phase: round(m.phase, 1), greenMax: round(m.greenMax, 1), aligned: round(m.aligned, 2), q: round(m.q, 2) };
        }
      } else {
        const C = m.C;
        const stats = platoonStats(d, C, m.phase);
        const green = Math.min(m.greenMin, m.greenMax);
        const isSignal = info.ownSignal || c.origin === "osm";
        let category;
        if (isSignal) category = "signal";              // fixed-time light
        else if (streets.length) {                       // periodic platoons released upstream
          category = "platoons";
          const nLanes = info.crosses ? lanes(info.crosses, info.twoWay) : 2;
          model.cars = Math.round((stats.duration / opts.headway) * nLanes);
        } else category = "periodic";                   // without the map: light or platoon, unknown
        const change = planChange(md.events, m, lastTs);
        if (change) model.planChange = { date: localIsoDate(change.date), before: round(change.before, 2), after: round(change.after, 2), daysAgo: round(change.days, 1) };
        Object.assign(model, {
          category, cycle: round(C, 2), phase: round(m.phase, 1), green: round(green, 1), greenMax: round(m.greenMax, 1),
          q: round(m.q, 2), aligned: round(m.aligned, 2),
          duration: Number.isNaN(stats.duration) ? null : round(stats.duration, 1),
          delayPerPass: round(stats.delayPerPass, 1),
        });
        md.m.green = green;
      }
      model.detail = md.events.map((e) => ({
        walk: e.track, time: localSeconds(e.pass), wait: e.wait ? round(e.wait, 1) : 0,
        release: e.wait ? round(localSeconds(e.release), 1) : null, inferred: Boolean(e.inferred),
      }));
      result.models.push(model);
    }
    results.push(result);
  }

  // ---- frequent routes: sequence of crossings and best departure windows
  progress("recommendations");
  const waitsOf = new Map();
  for (const c of live) {
    for (const e of c.events) {
      if (!e.wait) continue;
      if (!waitsOf.has(e.track)) waitsOf.set(e.track, []);
      waitsOf.get(e.track).push([e.pass, e.wait]);
    }
  }
  const routeResults = [];
  for (const group of groups) {
    if (!frequent.has(group)) continue;
    const names = new Set(group.tracks.map((t) => t.name));
    const complete = group.tracks.filter((t) => t.complete !== false);
    const reference = complete.length ? complete : group.tracks;
    const centre = median(reference.map((t) => localSeconds(t.t[0])));
    const sequence = [];
    live.forEach((c, k) => {
      const events = c.events.filter((e) => names.has(e.track));
      if (events.length < 0.4 * group.tracks.length) return;
      const deltas = [];
      for (const t of reference) {
        const e = events.find((ev) => ev.track === t.name);
        if (!e) continue;
        const previous = (waitsOf.get(t.name) ?? []).filter(([p]) => p < e.pass).reduce((acc, [, w]) => acc + w, 0);
        deltas.push(e.pass - t.t[0] - previous - (e.wait || 0));
      }
      if (!deltas.length) return;
      const delta = median(deltas);
      const key = bandKey(group.dayType, bandOf(centre + delta, group.dayType));
      let md = c.models.get(key);
      if (md?.mergedInto) md = c.models.get(md.mergedInto);
      sequence.push({ id: k, delta, md, deltas, waits: events.map((e) => e.wait || 0) });
    });
    sequence.sort((a, b) => a.delta - b.delta);
    const route = {
      route: group.route, dayType: group.dayType, walks: group.tracks.length, from: group.from, to: group.to,
      crossings: sequence.map((s) => ({ id: s.id, delta: Math.round(s.delta), status: s.md ? s.md.status : "no-data" })),
    };
    let paceSd = 0.05;
    const items = [];
    for (const s of sequence) {
      if (s.deltas.length >= 5 && s.delta > 60) paceSd = std(s.deltas) / s.delta;
      if (s.md && s.md.status !== "observing") {
        const m = { ...s.md.m };
        m.green ??= Math.min(m.greenMin, m.greenMax);
        items.push({ delta: s.delta, model: m });
      } else {
        items.push({ delta: s.delta, samples: s.waits.length ? s.waits : [0] });
      }
    }
    if (items.some((it) => it.model)) {
      const { best, average, windows } = recommend(items, centre - 900, centre + 900, opts.margin, paceSd);
      Object.assign(route, { windows: windows.slice(0, 20), averageWait: round(average, 1), bestWait: round(best, 1), paceVariation: round(paceSd, 3) });
    }
    routeResults.push(route);
  }

  return { crossings: results, routes: routeResults, groups, lastTs };
}

const round = (v, digits) => Number(v.toFixed(digits));
