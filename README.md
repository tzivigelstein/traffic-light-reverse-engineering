# Cruce

Reverse-engineers the traffic-light cycles along your usual walks. Every recorded walk is
grouped into routes, every repeated stop becomes a crossing, and once enough waits line up
the app shows the light's cycle, when the next green starts and what you did on past passes.

Everything runs in the browser: drop your Apple Health `export.zip` in "Tus datos" and the
analysis (a port of the original Python script) runs in a Web Worker on your device. Nothing
is uploaded; the only network calls are map tiles and, optionally, an Overpass query for
street names and traffic signals (if Overpass is unreachable the analysis continues without
street names). The app starts empty until you import.

## Development

```sh
npm install
npm run dev       # http://localhost:5173
npm run build     # static build in dist/
npm run preview   # serve dist/
```

No framework: plain ES modules, CSS custom properties and Vite for bundling. `fflate` streams
the zip. Background tiles come from CARTO and need a free key: copy `.env.example` to
`.env.local` and set `VITE_CARTO_API_KEY` (https://carto.com/basemaps/apikey).

## Layout

```
index.html                 Static shell (Spanish markup) + entry script
src/
  main.js                  Bootstraps map, panel, dialog and the live clock
  config.js                Time zone, period cutoff, storage keys, zoom limits
  live-clock.js            One rAF ticker shared by everything that animates with wall-clock time
  data-sheet.js            "Tus datos" dialog: import, summary, clear this device
  analysis/                The analysis itself, pure JS, no DOM (runs in a worker)
    index.js               analyzeInWorker(file) — page-side entry
    worker.js, run.js      Worker entry and the pipeline: zip -> tracks -> OSM -> analyze -> dataset
    zip.js, sources.js     Streaming unzip; picks walking routes using export.xml
    gpx.js, track.js       GPX points -> 1 Hz track with smoothing, speed and detected waits
    crossings.js           Wait points, facing corners, map signals, one event per walk and crossing
    cycle.js               Cycle/phase fit, chance and sharpness tests, status, missing waits, plan changes
    analyze.js             Orchestrates models per band, coordinated cycles, merged bands, recommendations
    routes.js, recommend.js Route grouping by start/end/day/band; departure-time simulation
    osm.js                 Overpass query, street/signal labelling (cached in IndexedDB)
    export.js              Results -> app dataset (RDP-simplified traces, routes, origin)
    constants.js, numeric.js, geometry.js, local-time.js
  i18n/es.js               Every user-facing string rendered from JS, plus locale tables
  lib/                     Pure helpers: dom, format, stats, storage, time, geo, svg-arc
  model/                   Data access and domain logic, no DOM
    dataset.js             Lookups over the dataset
    state.js               Selection, filters, custom names, navigation stack, change events
    crossings.js           Status, live model selection, cycle phases, pass classification
    routes.js              Period filter, route grouping, crossings along a route
    time-bands.js          Hour bands the analysis splits days into
    selection.js           What the map should frame/highlight for the current selection
  map/                     SVG map: viewport transform, traces, markers, OSM tiles, gestures, scale bar
  panel/                   Side panel: one module per view, charts, cycle clock, inline rename
  styles/                  tokens (light/dark palette), base, map, panel, clock, dialog
```

### Conventions

- Code, CSS class names, ids and dataset keys are in English; the UI is in Rioplatense Spanish.
- Text rendered from JS lives in `src/i18n/es.js`; static text lives in `index.html`.
- `model/` never touches the DOM. Views in `panel/` return HTML strings; `panel/panel.js`
  binds `data-*` attributes to state actions; `main.js` reacts to state changes.
- Per-user preferences (list tab, period, route names) persist in `localStorage`.

## Dataset

The dataset is produced on the device and kept in `localStorage` (schema in
`src/model/types.js`). Coordinates are metres east/north of `origin`, which is also the usual
departure point. Field-by-field
documentation is in `src/model/types.js`. Enum values are English too:
headings (`north`, `northeast`, …), `status` (`observing` | `probable` | `confirmed`) and
`dayType` (`weekday` | `weekend`), `kind` (`signal` | `no-signal`).

## Analysis

`src/analysis` is a function-by-function port of the Python prototype. The main differences:
the report and CSV it printed are replaced by the dataset the app renders; the recommender
uses a seeded mulberry32 PRNG instead of numpy's, so its windows can differ by a second;
`export.xml` is scanned as it inflates rather than parsed as a tree. Thresholds and the
reasoning behind them live in `analysis/constants.js`.
