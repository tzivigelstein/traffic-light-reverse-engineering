/**
 * All user-facing text, in Rioplatense Spanish.
 * Static markup in index.html is also Spanish; everything rendered from JS comes from here.
 * Functions take already-formatted values (see lib/format.js) and return strings.
 */

const plural = (n, one, many) => (n === 1 ? one : many);

export const locale = {
  decimalSeparator: ",",
  monthsShort: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  months: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  /** Monday first, matching `walk.weekday`. */
  weekdays: ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"],
  units: { km: "km", m: "m", min: "min", s: "s" },
  longDate: (weekday, day, month) => `${weekday} ${day} de ${month}`,
  minutesSeconds: (min, s) => `${min} min ${s} s`,
};

export const enums = {
  heading: {
    north: "norte", northeast: "noreste", east: "este", southeast: "sureste",
    south: "sur", southwest: "suroeste", west: "oeste", northwest: "noroeste",
  },
  status: { confirmed: "Confirmado", probable: "Probable", observing: "En observación" },
  dayType: { weekday: "días hábiles", weekend: "fines de semana" },
  dayTypeTitle: { weekday: "Días hábiles", weekend: "Fines de semana" },
  certainty: { provisional: "provisional", confirmed: "confirmado" },
  /** What the walker did on each pass, for the clock ring and monthly bars. */
  passCategory: { green: "Verde", waitedGreen: "Esperó el verde", crossedRed: "Cruzó en rojo", waitedGap: "Esperó un hueco" },
  lightState: { green: "Verde", changing: "Cambiando", red: "Rojo" },
};

export const t = {
  common: {
    back: "Volver",
    times: (n) => plural(n, "vez", "veces"),
    passes: "pasadas",
    noPattern: "sin patrón",
    dash: "–",
  },

  labels: {
    crossing: (id) => `Cruce ${id}`,
    crossingAria: (id, status) => `Cruce ${id}, ${status.toLowerCase()}`,
    defaultRouteName: (heading, km) => `Hacia el ${heading}, ${km}`,
    /** "días hábiles de 7 a 10 h" */
    timeBand: (dayType, from, to) => `${dayType} de ${from} a ${to} h`,
    joinBands: (bands) => bands.join(" y "),
    cycleOf: (seconds) => `ciclo de ${seconds} s`,
    waitsMissing: (n) => `faltan unas ${n} esperas`,
    noCycle: "las esperas no siguen un ciclo",
    progressAria: (waits, total) => `${waits} de unas ${total} esperas`,
    approx: "≈ ",
  },

  map: {
    lightGreen: (s) => `Verde ${s} s`,
    lightChanging: "Cambiando",
    lightRed: (s) => `Rojo ${s} s`,
  },

  list: {
    tabRoutes: "Recorridos",
    tabCrossings: "Cruces",
    tabsAria: "Lista",
    periodAria: "Período",
    periodAll: "Todo",
    periodWatch: "Desde que usás el reloj",
    summary: (walks, km) => `<b>${walks}</b> caminatas, <b>${km}</b> km`,
    repeatedRoutes: "Recorridos que repetís",
    repeatedRoutesHint: "Se agrupan solos por dónde empiezan y terminan.",
    routeMeta: (typicalMinutes, from, to) => `${typicalMinutes} típicos, sale entre ${from} y ${to}`,
    timesUnit: "veces",
    noRepeatedRoutes: "En este período no repetiste ningún recorrido.",
    looseWalks: "Caminatas sueltas",
    walkMeta: (hm, minutes) => `${hm}, ${minutes}`,
    noLooseWalks: "No hay caminatas sueltas en este período.",
    detectedCrossings: "Cruces detectados",
    detectedCrossingsHint: "Cada cruce junta todas las caminatas que pasan por ahí. Los que tienen pocos datos aparecen, pero no se usan para recomendar hasta confirmarse.",
    crossingName: (id, direction) => `Cruce ${id}, caminando ${direction}`,
    crossingMeta: (status, passes, routes) =>
      `${status}. ${passes} pasadas en ${routes} ${plural(routes, "recorrido", "recorridos")}.`,
    crossingCycle: (seconds, provisional) => `Ciclo de ${seconds} s${provisional ? ", provisional" : ""}.`,
    crossingUnknownCycle: "Duración todavía desconocida.",
    waitsMissingUnit: "esperas faltan",
  },

  route: {
    timesCount: (n, sinceWatch) => `${n} ${plural(n, "vez", "veces")}${sinceWatch ? " desde que usás el reloj" : ""}.`,
    rename: "Cambiar nombre",
    hasReturn: "Tiene su vuelta:",
    lengthLabel: "de largo",
    typicalLabel: (from, to) => `típicos (entre ${from} y ${to})`,
    waitingLabel: (waited, total) => `esperando en cruces, en promedio (${waited} de ${total} veces esperaste)`,
    crossingsLabel: (n) => `${plural(n, "cruce", "cruces")} con datos en el camino`,
    crossingsOnTheWay: "Cruces en el camino",
    crossingAt: (id, metres) => `Cruce ${id}, a ${metres} m`,
    crossingWaits: (status, waits, passes) => `${status}. Esperaste ${waits} de ${passes} veces.`,
    perPass: "por vez",
    noCrossings: "Todavía no hay cruces con esperas repetidas en este recorrido.",
    noConfirmedYet: "Cuando se confirme algún cruce de este recorrido, acá vas a ver a qué hora te conviene salir para esperar menos.",
    allTimes: "Todas las veces",
    recordedHalfway: ", grabada desde la mitad",
    fixedPrecisionSuffix: ", precisión fija",
    waitedChip: (s) => `${s} s esperando`,
    noWaitsChip: "sin esperas",
    nameInputLabel: "Nombre del recorrido",
    nameInputHint: "Enter para guardar. Vacío vuelve al nombre automático.",
  },

  charts: {
    durationsTitle: "Duración de cada vez",
    durationsAria: "Duración de cada caminata de este recorrido",
    pointTitle: (date, minutes) => `${date}: ${minutes} min`,
    normalRecording: "Grabación normal",
    fixedPrecisionRecording: "Grabación de precisión fija",
    crossingWaits: "Esperas en cruces",
    departuresTitle: "A qué hora salís",
    departuresRow: (name, n) => `${name}: ${n} ${plural(n, "vez", "veces")}`,
  },

  walk: {
    departedAt: (hm) => `Saliste a las ${hm}.`,
    routePrefix: "Recorrido:",
    looseWalk: "Caminata suelta.",
    durationLabel: "de duración",
    distanceLabel: "recorridos",
    stopsLabel: (n) => `${plural(n, "parada", "paradas")} de 6 s o más`,
    fixedPrecision: "Precisión fija",
    normal: "Normal",
    fixedPrecisionHint: "en este tipo de grabación nunca aparecieron paradas, así que las esperas se deducen por la demora",
    normalHint: "grabación con la precisión variable habitual del GPS",
    atCrossings: "En los cruces",
    passedAt: (time, inferred) => `Pasaste a las ${time}${inferred ? ", espera deducida por la demora" : ""}`,
    waitedChip: (s) => `esperaste ${s} s`,
    noWaitChip: "sin esperar",
    noCrossings: "Esta caminata no pasó por ningún cruce detectado.",
    otherStops: "Otras paradas",
    otherStopsHint: (n) =>
      `${n} ${plural(n, "parada", "paradas")} fuera de los cruces conocidos, marcadas en ámbar en el mapa. Si se repiten en otras caminatas, se convierten en cruces.`,
  },

  crossing: {
    subtitle: (direction, kind) => `Caminando ${direction}${kind ? `, ${kind}` : ""}.`,
    badge: (status, missing) => `${status}${missing ? `: faltan unas ${missing} esperas` : ""}`,
    noPatternYet: "Todavía no hay un patrón para mostrar.",
    noPatternMissing: (n) => `Con unas ${n} esperas más en la misma franja horaria se podrá confirmar o descartar.`,
    noPatternNoCycle: "Las esperas que hay no siguen un ciclo.",
    byDayAndTime: "Por día y horario",
    byDayAndTimeHint: "Cada franja puede tener otro plan de semáforos; las que coinciden se unen solas.",
    modelMeta: (status, passes, waits, inferred, detail) =>
      `${status}: ${passes} pasadas, ${waits} esperas${inferred ? ` (${inferred} deducidas)` : ""}. ${detail}.`,
    whoPasses: "Quién pasa por acá",
    repeatedRoute: "Recorrido que repetís",
    looseWalk: "Caminata suelta",
    looseWalkHint: "Suma datos igual",
  },

  clock: {
    durationTitle: "Cuánto dura este semáforo",
    durationHint: (bands) => `Lo que se sabe hasta ahora, para ${bands}.`,
    cycleBarAria: (greenMin, greenMax, cycle) =>
      `Un ciclo: verde seguro hasta ${greenMin} s, final dudoso hasta ${greenMax} s, rojo hasta ${cycle} s`,
    zeroSeconds: "0 s",
    fullCycle: "Ciclo completo",
    fullCycleValue: (cycle, minSec, certainty) => `${cycle} s (${minSec}), ${certainty}`,
    greenToCross: "Verde para cruzar",
    greenToCrossValue: (min, max) => `entre ${min} y ${max} s. Seguro los primeros ${min} s; el final no se sabe con precisión`,
    red: "Rojo",
    redValue: (min, max) => `entre ${min} y ${max} s`,
    greenStarts: "Cuándo arranca el verde",
    greenStartsValue: (time, cycle) => `a las ${time}, y después cada ${cycle} s. Precisión de unos ±3 s`,
    unknown: "Qué falta saber",
    unknownValue: (provisional) =>
      `${provisional ? "confirmar el ciclo con más esperas, " : ""}el plan en otros horarios y días, y exactamente cuándo corta el verde`,
    liveTitle: (provisional) => `${provisional ? "Patrón provisional" : "Ciclo del semáforo"}, en vivo`,
    liveHint: (bands, cycle, provisional) =>
      `Para ${bands}. Ciclo de ${cycle} s.${provisional ? " Es el mejor ajuste hasta ahora: sirve de guía, no está confirmado." : ""}`,
    upcomingGreens: "Próximos verdes",
    ringHint: "Los puntos del anillo son tus pasadas en esta franja; los sin relleno, de grabaciones de precisión fija.",
    redArrivalTitle: "Qué hiciste al llegar en rojo",
    redArrivalHint: "El porcentaje es cuántas veces no esperaste el verde. Alto suele querer decir calles vacías.",
    fewSamples: "pocos",
    monthLabel: (monthShort, yy) => `${monthShort} ${yy}`,
    countdownGreen: (s) => `<b>${s} s</b>de verde seguro`,
    countdownChanging: (s) => `puede cortarse<b>${s} s</b>al próximo verde`,
    countdownRed: (s) => `<b>${s} s</b>para el verde`,
    announce: (state) => `${state} en el cruce`,
    outsideBand: "Ahora estás fuera de la franja medida: el ciclo puede ser otro en este horario.",
  },

  dataSheet: {
    walksWithRoute: "Caminatas con ruta",
    repeatedRoutes: "Recorridos que repetís",
    looseWalks: "Caminatas sueltas",
    fixedPrecisionRecordings: "Grabaciones de precisión fija",
    detectedCrossings: "Cruces detectados",
    period: "Período",
    periodValue: (fromMonth, toMonth, year) => `${fromMonth} a ${toMonth} ${year}`,
    filePicked: (name, mb) => `Elegiste ${name} (${mb} MB). Esta versión de diseño todavía no lo procesa.`,
  },
};
