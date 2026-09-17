/**
 * Dataset schema: produced by src/analysis in the browser from a Health export and kept in
 * localStorage; the app starts empty until the user imports one.
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
 * @property {Recommendation[]} [recommendations]  Best departure windows, one per day type (frequent routes only)
 *
 * @typedef {Object} Recommendation
 * @property {DayType} dayType
 * @property {number} walks                Walks in this group
 * @property {number} from                 Earliest departure of the group, seconds of day
 * @property {number} to
 * @property {{id: number, delta: number, status: string}[]} crossings  Crossings along the way, seconds after departure
 * @property {[number, number][]|null} windows   Departure windows (seconds of day) with the least waiting, widest first
 * @property {number|null} averageWait     Expected total wait leaving at random, seconds
 * @property {number|null} bestWait        Expected total wait inside the best windows
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
 * @property {"signal"|"no-signal"|null} kind  What the map says about the corner (null without map data)
 * @property {string|null} street          Name of the street you cross, when the map knows it
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
 * @property {"signal"|"platoons"|"periodic"} [category]  Fixed-time light, platoons released upstream, or unknown without map
 * @property {number} [green]              Conservative green length, seconds
 * @property {number} [q]                  Probability of not waiting for the green when arriving on red
 * @property {number} [aligned]            Fraction of waits released within ±4 s of the phase
 * @property {number|null} [duration]      Estimated red/platoon duration, seconds
 * @property {number} [delayPerPass]       Mean seconds lost per pass
 * @property {number} [cars]               Cars per platoon, order of magnitude (platoons only)
 * @property {{date: string, before: number, after: number, daysAgo: number}} [planChange]  The pattern stopped holding around `date`
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
