import { useState } from "react";
import RouteMap from "./RouteMap";
import QrBlock from "./QrBlock";
import { StatusBadge, Stepper, Card } from "./ui";
import { PARCEL_STATES } from "../lib/stateMachine";
import { formatEta } from "../lib/route";
import { stopsBetween } from "../lib/seedData";

function relativeTime(ts) {
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const h = Math.floor(diffMin / 60);
  return `${h}h ${diffMin % 60}m ago`;
}

function statusLine(parcel, route, originStop, destStop, progress) {
  if (parcel.missed) {
    return `Missed at ${destStop.name} — held aboard, conductor will retry the drop`;
  }
  switch (parcel.state) {
    case PARCEL_STATES.BOOKED:
      return `Booking confirmed — meet the conductor at the ${originStop.name} stop`;
    case PARCEL_STATES.IN_TRANSIT: {
      const forward = destStop.pos >= originStop.pos;
      const ordered = stopsBetween(route, originStop.pos, destStop.pos);
      const sampleAt = (t) => originStop.pos + t * (destStop.pos - originStop.pos);
      let lastStop = ordered[0];
      let nextStop = ordered[ordered.length - 1];
      for (const s of ordered) {
        const reached = forward ? sampleAt(progress) >= s.pos : sampleAt(progress) <= s.pos;
        if (reached) lastStop = s;
        else {
          nextStop = s;
          break;
        }
      }
      if (progress < 0.04) return `Collected from sender at ${lastStop.name} — on the way`;
      if (progress > 0.9) return `Arriving at ${destStop.name}`;
      return `Left ${lastStop.name}, heading toward ${nextStop.name}`;
    }
    case PARCEL_STATES.COLLECTED:
      return `Delivered to ${parcel.receiverName}`;
    default:
      return "";
  }
}

export default function TrackingScreen({ parcel, route, originStop, destStop, progress, bus }) {
  const [showLog, setShowLog] = useState(false);
  const inTransit = parcel.state === PARCEL_STATES.IN_TRANSIT;
  const minutesRemaining = inTransit ? parcel.tripDurationMinutes * (1 - progress) : null;

  const overallProgress = {
    [PARCEL_STATES.BOOKED]: 0.04,
    [PARCEL_STATES.IN_TRANSIT]: 0.1 + progress * 0.8,
    [PARCEL_STATES.COLLECTED]: 1,
  }[parcel.state];

  return (
    <div className="flex flex-col">
      <Card className="overflow-hidden">
        <div className="h-56 sm:h-64 md:h-72 bg-gradient-to-b from-slate-50 to-white">
          <RouteMap
            pathD={route.pathD}
            viewBox={route.viewBox}
            stops={route.stops}
            fromPos={originStop.pos}
            toPos={destStop.pos}
            progress={inTransit ? progress : parcel.state === PARCEL_STATES.COLLECTED ? 1 : 0}
            originLabel={originStop.name}
            destinationLabel={destStop.name}
          />
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[15px] sm:text-base font-bold text-slate-900 leading-snug">
                {statusLine(parcel, route, originStop, destStop, progress)}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Parcel {parcel.id}</div>
            </div>
            <StatusBadge state={parcel.state} />
          </div>

          <div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs">
              <span className="text-slate-400">{originStop.name} stop</span>
              {inTransit ? (
                <span className="font-semibold text-rose-600 tabular-nums">
                  ETA {formatEta(minutesRemaining)}
                </span>
              ) : (
                <span className="text-slate-300">·</span>
              )}
              <span className="text-slate-400">{destStop.name} stop</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs bg-slate-50 rounded-xl px-3 py-2.5">
            <div className="flex-1">
              <div className="text-slate-400">Bus</div>
              <div className="font-semibold text-slate-700">{bus.id}</div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex-1">
              <div className="text-slate-400">Conductor</div>
              <div className="font-semibold text-slate-700">{bus.conductorName}</div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex-1">
              <div className="text-slate-400">Fare</div>
              <div className="font-semibold text-slate-700">
                ₹{parcel.fee + parcel.returnFee} <span className="text-[10px] text-slate-400">({parcel.paymentMethod === "COD" ? "at pickup" : "paid"})</span>
              </div>
            </div>
          </div>

          {parcel.missed && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-3">
              <div className="text-xs font-semibold text-amber-800">
                {parcel.receiverName} wasn't at the {destStop.name} stop
              </div>
              <div className="text-[11px] text-amber-700/80 mt-1">
                On-time delivery means being there when the bus arrives — the parcel is riding on and the conductor will try the drop again. A ₹{parcel.returnFee} return fee has been added
                {parcel.paymentMethod === "COD" ? ", payable with the rest at pickup." : " to your total."}
              </div>
            </div>
          )}

          {parcel.state !== PARCEL_STATES.COLLECTED && (
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-3">
              {parcel.state === PARCEL_STATES.BOOKED ? (
                <>
                  <QrBlock value={parcel.id} size={64} />
                  <p className="text-xs text-slate-500">
                    Go to the <span className="font-semibold">{originStop.name}</span> bus stop and show this QR (or just say the parcel ID) to the conductor when the bus arrives.
                  </p>
                </>
              ) : (
                <div>
                  <div className="text-xs font-semibold text-slate-700">Collection code for {parcel.receiverName}</div>
                  <div className="text-xl font-black tracking-[0.3em] text-rose-600 mt-1">{parcel.releaseOtp}</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Sent by SMS to {parcel.receiverPhone} (simulated). {parcel.receiverName} reads this out to the conductor at the {destStop.name} stop.
                  </div>
                </div>
              )}
            </div>
          )}

          <Stepper state={parcel.state} />

          <button
            onClick={() => setShowLog((v) => !v)}
            className="w-full text-left text-xs font-semibold text-slate-500 flex items-center justify-between py-1"
          >
            <span>Custody trail ({parcel.custodyLog.length})</span>
            <span className="text-slate-400">{showLog ? "Hide ▲" : "Show ▼"}</span>
          </button>
          {showLog && (
            <div className="space-y-2 pt-1">
              {parcel.custodyLog.map((e) => (
                <div key={e.id} className="flex gap-3 text-xs">
                  <div className="w-16 shrink-0 text-slate-400 tabular-nums">{relativeTime(e.timestamp)}</div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-700">{e.note}</div>
                    <div className="text-slate-400">{e.actorName} · {e.actorRole.toLowerCase()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
