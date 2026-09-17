/**
 * Dataset schema (src/data/dataset.json), produced by the offline analysis.
 * Coordinates are metres east/north of `origin`, which is also the usual departure point.
 *
 * @typedef {Object} Dataset
 * @property {string} updatedAt            ISO date of the last processed walk
 * @property {{lat: number, lon: number}} [origin]  Real-world position of (0, 0); enables background tiles
 * @property {Route[]} routes
 * @property {Crossing[]} crossings
 * @property {Walk[]} walks
 *
 * @typedef {Object} Route
 * @property {number} id
 * @property {number} count                Walks grouped into this route (>= 2 means a repeated route)
 * @property {Heading} heading             Overall compass direction
 * @property {number} km
 * @property {number|null} returnRouteId   The same route walked the other way, if detected
 *
 * @typedef {"north"|"northeast"|"east"|"southeast"|"south"|"southwest"|"west"|"northwest"} Heading
 *
 * @typedef {Object} Crossing
 * @property {number} id
 * @property {number} x
 * @property {number} y
 * @property {number} axis                 Street axis in degrees, counter-clockwise from east
 * @property {string} walkingDirection     e.g. "northeast-southwest"
 * @property {number} passes
 * @property {string|null} kind            Map-derived crossing type, when available
 * @property {CrossingModel[]} models      One per time band that had enough passes
 *
 * @typedef {Object} CrossingModel
 * @property {DayType} dayType
 * @property {string} timeBand             "7–10" (hours, en dash)
 * @property {[DayType, string][]} includes  Bands merged into this model
 * @property {Status} status
 * @property {number} passes
 * @property {number} waits
 * @property {number} inferred             Waits deduced from delay rather than a detected stop
 * @property {number|null} missing         Waits still needed to confirm or discard a cycle
 * @property {number} [cycle]              Confirmed/probable cycle length in seconds
 * @property {number} [phase]              Seconds after midnight when a green starts
 * @property {number} [greenMax]           Latest observed green, seconds into the cycle
 * @property {CycleFit} [provisional]      Best fit so far while still observing
 *
 * @typedef {"weekday"|"weekend"} DayType
 * @typedef {"observing"|"probable"|"confirmed"} Status
 *
 * @typedef {Object} CycleFit
 * @property {number} cycle
 * @property {number} phase
 * @property {number} greenMax
 * @property {number} aligned              Fraction of waits consistent with the fit
 * @property {number} q
 *
 * @typedef {Object} Walk
 * @property {string} id
 * @property {number} routeId
 * @property {boolean} complete            False when recording started mid-walk
 * @property {string} date                 ISO date
 * @property {number} weekday              0 = Monday … 6 = Sunday
 * @property {number} departure            Seconds since midnight
 * @property {number} duration             Seconds
 * @property {number} km
 * @property {boolean} fixedPrecision      Recording mode that never shows stops; waits are inferred
 * @property {{x: number, y: number, seconds: number}[]} stops   Stops of 6 s or more
 * @property {WalkCrossing[]} crossings
 * @property {[number, number][]} points   Simplified trace
 *
 * @typedef {Object} WalkCrossing
 * @property {number} crossingId
 * @property {string} time                 "HH:MM:SS" of arrival
 * @property {number} wait                 Seconds waited (0 = crossed without stopping)
 * @property {boolean} inferred
 */

export {};
