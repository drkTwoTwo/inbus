// ---------------------------------------------------------------------------
// Cosmetic route-drawing / animation helpers. Each route's actual SVG path
// and stop list live in seedData.js next to the route they belong to; this
// file just holds the shared animation constants and formatters.
// ---------------------------------------------------------------------------

// Real seconds for the cosmetic bus icon to travel the full path (0 -> ~0.97;
// it deliberately never reaches 1 on its own -- only an actual "scan off
// bus" transition marks arrival, keeping the animation honest about what's
// simulated vs. what's real).
export const TRIP_ANIMATION_SECONDS = 75;
export const TRIP_ANIMATION_CAP = 0.97;

export function formatEta(minutesRemaining) {
  if (minutesRemaining <= 0) return "Arriving now";
  const h = Math.floor(minutesRemaining / 60);
  const m = Math.round(minutesRemaining % 60);
  if (h <= 0) return `${m} min`;
  return `${h}h ${m}m`;
}

const MIN_FARE = 40;
const MIN_TRIP_MINUTES = 15;

/**
 * A booking between two stops rides only part of the bus's full route, so
 * its price and duration are prorated by how much of the route (by SVG
 * path fraction) it actually covers -- a Bhowali -> Bhimtal hop shouldn't
 * cost the same as the full Nainital -> Almora fare.
 */
export function segmentFare(bus, fromPos, toPos) {
  const frac = Math.abs(toPos - fromPos);
  return Math.max(MIN_FARE, Math.round(bus.price * frac));
}

export function segmentDuration(bus, fromPos, toPos) {
  const frac = Math.abs(toPos - fromPos);
  return Math.max(MIN_TRIP_MINUTES, Math.round(bus.durationMinutes * frac));
}

/** Redelivery surcharge when the receiver misses the bus at the stop --
 * half the original fee, so it stings but stays proportional. */
export function missedSurcharge(fee) {
  return Math.max(20, Math.round(fee * 0.5));
}

export function formatDuration(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
