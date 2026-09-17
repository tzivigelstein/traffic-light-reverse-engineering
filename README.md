# Cruce

Reverse-engineers the traffic-light cycles along your usual walks. Every recorded walk is
grouped into routes, every repeated stop becomes a crossing, and once enough waits line up
the app shows the light's cycle, when the next green starts and what you did on past passes.

Everything runs in the browser from a static dataset; nothing is uploaded.

## Development

```sh
npm install
npm run dev       # http://localhost:5173
npm run build     # static build in dist/
npm run preview   # serve dist/
```

No framework: plain ES modules, CSS custom properties and Vite for bundling.

## Layout

```
index.html                 Static shell (Spanish markup) + entry script
src/
  main.js                  Bootstraps map, panel, dialog and the live clock
  config.js                Time zone, period cutoff, storage keys, zoom limits
  live-clock.js            One rAF ticker shared by everything that animates with wall-clock time
  data-sheet.js            "Tus datos" dialog
  data/dataset.json        Output of the offline analysis (schema in model/types.js)
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

`src/data/dataset.json` is produced by the offline analysis (not in this repo). Coordinates are
metres east/north of `origin`, which is also the usual departure point. Field-by-field
documentation is in `src/model/types.js`. Enum values are English too:
headings (`north`, `northeast`, …), `status` (`observing` | `probable` | `confirmed`) and
`dayType` (`weekday` | `weekend`).
