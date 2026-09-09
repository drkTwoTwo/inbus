// ---------------------------------------------------------------------------
// Parcel state machine (peer-to-peer over bus stops)
//
// BOOKED -> IN_TRANSIT -> COLLECTED
//
// There is no shop in this system. The sender meets the conductor in person
// at the origin bus stop and hands the parcel over directly (that scan is
// the BOOKED -> IN_TRANSIT transition). The conductor meets the receiver in
// person at the destination bus stop and hands it over directly once the
// receiver reads out the OTP (that's IN_TRANSIT -> COLLECTED). Every
// transition is a pure function: (parcel, payload) -> nextParcel, never
// mutates, and always appends one timestamped entry to parcel.custodyLog.
// Invalid calls throw -- the UI is expected to only call a transition when
// its guard passes, but the throw is the source of truth, not a disabled
// button.
//
// On-time delivery means the receiver is expected to actually be at the
// stop. If they're not, the parcel doesn't get stuck in a new formal state
// -- it just stays IN_TRANSIT (literally: it rides on) with a `missed`
// flag and an accumulated `returnFee`, and the conductor tries the release
// again whenever the bus (this one or another covering the same stop)
// comes back around.
// ---------------------------------------------------------------------------

export const PARCEL_STATES = Object.freeze({
  BOOKED: "BOOKED",
  IN_TRANSIT: "IN_TRANSIT",
  COLLECTED: "COLLECTED",
});

// Ordered for stepper UIs.
export const STATE_ORDER = [PARCEL_STATES.BOOKED, PARCEL_STATES.IN_TRANSIT, PARCEL_STATES.COLLECTED];

export const STATE_LABELS = {
  [PARCEL_STATES.BOOKED]: "Booked",
  [PARCEL_STATES.IN_TRANSIT]: "In transit",
  [PARCEL_STATES.COLLECTED]: "Collected",
};

export const ACTOR_ROLES = Object.freeze({
  SENDER: "SENDER",
  CONDUCTOR: "CONDUCTOR",
  RECEIVER: "RECEIVER",
  SYSTEM: "SYSTEM",
});

class TransitionError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "TransitionError";
    this.code = code;
  }
}

function assertState(parcel, expected, actionLabel) {
  if (parcel.state !== expected) {
    throw new TransitionError(
      `Cannot ${actionLabel}: parcel ${parcel.id} is ${parcel.state}, expected ${expected}.`,
      "INVALID_STATE",
    );
  }
}

function appendLog(parcel, entry) {
  return {
    ...parcel,
    custodyLog: [
      ...parcel.custodyLog,
      {
        id: `${parcel.id}-evt-${parcel.custodyLog.length + 1}`,
        timestamp: entry.timestamp ?? Date.now(),
        ...entry,
      },
    ],
  };
}

/**
 * Book a new parcel. Not a "transition" on an existing parcel (there is no
 * prior state) but included here so every state-producing operation lives
 * in one place. `originStopId` / `destinationStopId` are stop ids within
 * the chosen route -- the two physical bus stops where the sender and
 * receiver will meet the conductor in person.
 */
export function bookParcel({
  id,
  senderName,
  senderPhone,
  receiverName,
  receiverPhone,
  originStopId,
  destinationStopId,
  routeId,
  busId,
  tripDurationMinutes,
  paymentMethod = "PAID",
  description,
  declaredValue,
  fee,
  now = Date.now(),
}) {
  const otp = String(Math.floor(1000 + Math.random() * 9000));
  const parcel = {
    id,
    senderName,
    senderPhone,
    receiverName,
    receiverPhone,
    originStopId,
    destinationStopId,
    routeId,
    busId,
    tripDurationMinutes, // this booking's own hop, not the bus's full-route time
    description,
    declaredValue,
    fee,
    paymentMethod, // "PAID" (mock gateway, settled at booking) or "COD" (cash to the conductor at pickup)
    state: PARCEL_STATES.BOOKED,
    releaseOtp: otp,
    missed: false,
    missedCount: 0,
    returnFee: 0,
    createdAt: now,
    custodyLog: [],
  };
  return appendLog(parcel, {
    timestamp: now,
    from: null,
    to: PARCEL_STATES.BOOKED,
    actorRole: ACTOR_ROLES.SENDER,
    actorName: senderName,
    action: "BOOKED",
    note: `Booked by ${senderName} for delivery to ${receiverName}, bus ${busId}.`,
  });
}

/**
 * Conductor meets the sender in person at the origin stop and takes the
 * parcel aboard directly -- no shop, no waiting state in between.
 * BOOKED -> IN_TRANSIT
 */
export function collectFromSender(parcel, { actorName, stopName, now = Date.now() }) {
  assertState(parcel, PARCEL_STATES.BOOKED, "collect from sender");
  const next = { ...parcel, state: PARCEL_STATES.IN_TRANSIT };
  return appendLog(next, {
    timestamp: now,
    from: PARCEL_STATES.BOOKED,
    to: PARCEL_STATES.IN_TRANSIT,
    actorRole: ACTOR_ROLES.CONDUCTOR,
    actorName,
    action: "COLLECTED_FROM_SENDER",
    note: `Collected in person from ${parcel.senderName} at ${stopName}.`,
  });
}

/**
 * Conductor meets the receiver in person at the destination stop and hands
 * the parcel over directly once the receiver reads out the correct
 * 4-digit OTP.
 * IN_TRANSIT -> COLLECTED
 */
export function releaseToReceiver(parcel, { otpEntered, stopName, actorName, now = Date.now() }) {
  assertState(parcel, PARCEL_STATES.IN_TRANSIT, "release to receiver");
  if (otpEntered !== parcel.releaseOtp) {
    throw new TransitionError("Incorrect OTP.", "BAD_OTP");
  }
  const next = { ...parcel, state: PARCEL_STATES.COLLECTED, missed: false };
  return appendLog(next, {
    timestamp: now,
    from: PARCEL_STATES.IN_TRANSIT,
    to: PARCEL_STATES.COLLECTED,
    actorRole: ACTOR_ROLES.CONDUCTOR,
    actorName,
    action: "RELEASED_TO_RECEIVER",
    note:
      parcel.returnFee > 0
        ? `Handed to ${parcel.receiverName} at ${stopName} (OTP verified, ₹${parcel.returnFee} return fee collected).`
        : `Handed to ${parcel.receiverName} at ${stopName} (OTP verified).`,
  });
}

/**
 * The receiver wasn't at the stop when the conductor arrived. The parcel
 * doesn't move to a new state -- it stays IN_TRANSIT, literally riding on
 * -- but picks up a return fee for the redelivery attempt, and the
 * conductor tries the release again next time (same bus's return trip, or
 * a different bus that also covers this stop).
 * IN_TRANSIT -> IN_TRANSIT
 */
export function markMissed(parcel, { stopName, actorName, surcharge, now = Date.now() }) {
  assertState(parcel, PARCEL_STATES.IN_TRANSIT, "mark missed");
  const next = {
    ...parcel,
    missed: true,
    missedCount: parcel.missedCount + 1,
    returnFee: parcel.returnFee + surcharge,
  };
  return appendLog(next, {
    timestamp: now,
    from: PARCEL_STATES.IN_TRANSIT,
    to: PARCEL_STATES.IN_TRANSIT,
    actorRole: ACTOR_ROLES.CONDUCTOR,
    actorName,
    action: "MISSED_RECEIVER",
    note: `${parcel.receiverName} wasn't at ${stopName} — held aboard for redelivery (+₹${surcharge} return fee).`,
  });
}

export function isReleasable(parcel) {
  return parcel.state === PARCEL_STATES.IN_TRANSIT;
}

export function stateIndex(state) {
  return STATE_ORDER.indexOf(state);
}
