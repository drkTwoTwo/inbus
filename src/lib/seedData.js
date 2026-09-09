import { bookParcel, collectFromSender, releaseToReceiver } from "./stateMachine";

// ---------------------------------------------------------------------------
// Seed data: a peer-to-peer network of bus stops. There are no shops --
// senders and receivers meet the conductor in person at a stop. Two bus
// routes, each with a couple of scheduled buses at different times/prices,
// and a handful of parcels pre-populated so the app is never empty on
// first load.
// ---------------------------------------------------------------------------

const VIEWBOX = "0 0 340 220";

// Two physical routes, each drawn as a hand-authored winding SVG curve --
// no map library, no tiles, no API keys, so this can never fail to load.
// `stops[].pos` is a 0..1 fraction along the path. A booking can start and
// end at ANY stop on a route (not just the two ends) -- true point-to-point
// -- so `pos` is also what lets a booking's own "traveled segment" be
// carved out of the full path for its tracking map.
export const ROUTES = [
  {
    id: "route-nainital-almora",
    name: "Nainital ↔ Almora",
    viewBox: VIEWBOX,
    pathD:
      "M 24 40 C 70 30, 90 70, 70 100 C 50 130, 20 140, 40 168 " +
      "C 60 196, 110 190, 130 160 C 150 130, 140 100, 170 90 " +
      "C 200 80, 210 110, 200 140 C 190 170, 220 190, 260 176 " +
      "C 290 165, 300 130, 316 100",
    stops: [
      { id: "stop-nainital", name: "Nainital", pos: 0, kind: "town" },
      { id: "stop-bhowali", name: "Bhowali", pos: 0.22, kind: "intermediate" },
      { id: "stop-bhimtal", name: "Bhimtal", pos: 0.48, kind: "intermediate" },
      { id: "stop-garampani", name: "Garampani", pos: 0.74, kind: "intermediate" },
      { id: "stop-almora", name: "Almora", pos: 1, kind: "town" },
    ],
  },
  {
    id: "route-nainital-ranikhet",
    name: "Nainital ↔ Ranikhet",
    viewBox: VIEWBOX,
    pathD:
      "M 20 190 C 60 200, 70 160, 55 130 C 40 100, 60 80, 100 78 " +
      "C 140 76, 150 50, 130 30 C 118 18, 130 6, 150 8 " +
      "C 190 12, 210 40, 250 44 C 280 47, 310 30, 320 55 " +
      "C 328 75, 300 85, 316 105",
    stops: [
      { id: "stop-nainital-2", name: "Nainital", pos: 0, kind: "town" },
      { id: "stop-bhowali-2", name: "Bhowali", pos: 0.32, kind: "intermediate" },
      { id: "stop-khairna", name: "Khairna", pos: 0.66, kind: "intermediate" },
      { id: "stop-ranikhet", name: "Ranikhet", pos: 1, kind: "town" },
    ],
  },
];

// Buses run round trips, so the same schedule serves both directions of a
// route. Price and duration are what the sender compares when searching.
export const BUSES = [
  {
    id: "UK07 PA 4521",
    routeId: "route-nainital-almora",
    conductorName: "Deepak Bisht",
    conductorPhone: "9412384512",
    departureLabel: "6:30 AM",
    durationMinutes: 150,
    price: 180,
    type: "Express",
  },
  {
    id: "UK07 PA 7788",
    routeId: "route-nainital-almora",
    conductorName: "Anil Rawat",
    conductorPhone: "9412384513",
    departureLabel: "1:00 PM",
    durationMinutes: 165,
    price: 160,
    type: "Ordinary",
  },
  {
    id: "UK07 PB 3311",
    routeId: "route-nainital-ranikhet",
    conductorName: "Suman Negi",
    conductorPhone: "9412384514",
    departureLabel: "7:00 AM",
    durationMinutes: 110,
    price: 130,
    type: "Express",
  },
  {
    id: "UK07 PB 9042",
    routeId: "route-nainital-ranikhet",
    conductorName: "Harish Bora",
    conductorPhone: "9412384515",
    departureLabel: "3:30 PM",
    durationMinutes: 120,
    price: 120,
    type: "Ordinary",
  },
];

export function routeById(id) {
  return ROUTES.find((r) => r.id === id);
}

export function busById(id) {
  return BUSES.find((b) => b.id === id);
}

export function busesForRoute(routeId) {
  return BUSES.filter((b) => b.routeId === routeId);
}

export function stopInRoute(route, stopId) {
  return route.stops.find((s) => s.id === stopId);
}

/** Every stop across the whole network, deduplicated by name, for the
 * sender's "From" / "To" pickers -- true point-to-point, not just town
 * endpoints. */
export function allStops() {
  const byName = new Map();
  for (const route of ROUTES) {
    for (const stop of route.stops) {
      if (!byName.has(stop.name)) byName.set(stop.name, { name: stop.name, kind: stop.kind });
    }
  }
  return Array.from(byName.values());
}

/**
 * Find the route that has both named stops and the specific stop objects
 * for this direction. Returns null if no single route serves that pair --
 * a real, honest empty search result rather than always finding something.
 */
export function findRouteByStopNames(fromName, toName) {
  for (const route of ROUTES) {
    const fromStop = route.stops.find((s) => s.name === fromName);
    const toStop = route.stops.find((s) => s.name === toName);
    if (fromStop && toStop) {
      return { route, fromStop, toStop, reversed: fromStop.pos > toStop.pos };
    }
  }
  return null;
}

/** Stops within [fromPos, toPos] (inclusive, either direction), ordered by
 * actual travel order. Used to draw only this booking's traveled segment
 * and to build the "left X, heading to Y" status line. */
export function stopsBetween(route, fromPos, toPos) {
  const lo = Math.min(fromPos, toPos);
  const hi = Math.max(fromPos, toPos);
  const within = route.stops.filter((s) => s.pos >= lo - 1e-9 && s.pos <= hi + 1e-9);
  const forward = toPos >= fromPos;
  return forward ? within.slice().sort((a, b) => a.pos - b.pos) : within.slice().sort((a, b) => b.pos - a.pos);
}

const MIN = 60 * 1000;
const now = Date.now();

// ---------------------------------------------------------------------------
// Seeded parcel #1: currently IN_TRANSIT, somewhere between Bhowali and
// Bhimtal, on the morning Nainital -> Almora bus. Good for the tracking demo.
// ---------------------------------------------------------------------------
function buildInTransitParcel() {
  let p = bookParcel({
    id: "PCL-1001",
    senderName: "Anita Rawat",
    senderPhone: "9412345001",
    receiverName: "Vinod Pant",
    receiverPhone: "9412345002",
    originStopId: "stop-nainital",
    destinationStopId: "stop-almora",
    routeId: "route-nainital-almora",
    busId: "UK07 PA 4521",
    tripDurationMinutes: 150,
    paymentMethod: "PAID",
    description: "Sealed carton, medicines",
    declaredValue: 1200,
    fee: 180,
    now: now - 70 * MIN,
  });
  p = collectFromSender(p, { actorName: "Deepak Bisht", stopName: "Nainital", now: now - 60 * MIN });
  return p;
}

// ---------------------------------------------------------------------------
// Seeded parcel #2: IN_TRANSIT and nearly arrived (Almora -> Nainital,
// reversed direction), so the conductor has something ready to release to
// a receiver right away.
// ---------------------------------------------------------------------------
function buildNearArrivalParcel() {
  let p = bookParcel({
    id: "PCL-1002",
    senderName: "Suresh Pant",
    senderPhone: "9412345003",
    receiverName: "Kavita Joshi",
    receiverPhone: "9412345004",
    originStopId: "stop-almora",
    destinationStopId: "stop-nainital",
    routeId: "route-nainital-almora",
    busId: "UK07 PA 7788",
    tripDurationMinutes: 165,
    paymentMethod: "PAID",
    description: "Small parcel, documents + a gift box",
    declaredValue: 500,
    fee: 160,
    now: now - 200 * MIN,
  });
  p = collectFromSender(p, { actorName: "Anil Rawat", stopName: "Almora", now: now - 190 * MIN });
  return p;
}

// ---------------------------------------------------------------------------
// Seeded parcel #3: freshly BOOKED, Nainital -> Almora on the afternoon
// bus, ready for the conductor to collect from the sender at Nainital.
// ---------------------------------------------------------------------------
function buildBookedParcel() {
  return bookParcel({
    id: "PCL-1003",
    senderName: "Deepa Rana",
    senderPhone: "9412345005",
    receiverName: "Manoj Bisht",
    receiverPhone: "9412345006",
    originStopId: "stop-nainital",
    destinationStopId: "stop-almora",
    routeId: "route-nainital-almora",
    busId: "UK07 PA 7788",
    tripDurationMinutes: 165,
    paymentMethod: "COD",
    description: "Woollen shawls, gift wrapped",
    declaredValue: 2000,
    fee: 160,
    now: now - 15 * MIN,
  });
}

// ---------------------------------------------------------------------------
// Seeded parcel #4: freshly BOOKED on the other route (Nainital ->
// Ranikhet), so that route/bus has something to demo too.
// ---------------------------------------------------------------------------
function buildRanikhetBookedParcel() {
  return bookParcel({
    id: "PCL-1004",
    senderName: "Rakesh Sharma",
    senderPhone: "9412345008",
    receiverName: "Neha Mehta",
    receiverPhone: "9412345009",
    originStopId: "stop-nainital-2",
    destinationStopId: "stop-ranikhet",
    routeId: "route-nainital-ranikhet",
    busId: "UK07 PB 3311",
    tripDurationMinutes: 110,
    paymentMethod: "PAID",
    description: "Packed snacks (for a shop order)",
    declaredValue: 900,
    fee: 130,
    now: now - 20 * MIN,
  });
}

export const SEED_PARCELS = [
  buildInTransitParcel(),
  buildNearArrivalParcel(),
  buildBookedParcel(),
  buildRanikhetBookedParcel(),
];

// Initial cosmetic progress (0..1 within each booking's own traveled
// segment) for parcels that are already IN_TRANSIT when the app loads.
// Purely visual -- see busProgress handling in App.jsx.
export const INITIAL_BUS_PROGRESS = {
  "PCL-1001": 0.42,
  "PCL-1002": 0.9,
};
