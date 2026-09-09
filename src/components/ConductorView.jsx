import { useState } from "react";
import { PARCEL_STATES } from "../lib/stateMachine";
import { Card, inputClass } from "./ui";

function CollectRow({ parcel, onAction }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-slate-800">{parcel.id}</div>
        <div className="text-xs text-slate-400 truncate">{parcel.description}</div>
        <div className="text-xs text-slate-400 mt-0.5">From {parcel.senderName}</div>
      </div>
      <button
        onClick={onAction}
        className="shrink-0 rounded-lg bg-rose-500 text-white text-xs font-bold px-3 py-2 active:scale-95 transition"
      >
        Scan aboard
      </button>
    </div>
  );
}

function ReleaseRow({ parcel, onRelease, onMissed }) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  function submit() {
    const res = onRelease(parcel.id, otp);
    if (!res.ok) {
      setError(res.error === "Incorrect OTP." ? "Incorrect OTP, try again." : res.error);
    } else {
      setError("");
      setOtp("");
    }
  }

  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-sm text-slate-800">{parcel.id}</div>
        {parcel.missed && (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 shrink-0">
            missed {parcel.missedCount}× · +₹{parcel.returnFee}
          </span>
        )}
      </div>
      <div className="text-xs text-slate-400">{parcel.description}</div>
      <div className="text-xs text-slate-400">For {parcel.receiverName} · {parcel.receiverPhone}</div>
      <div className="flex gap-2 mt-2">
        <input
          value={otp}
          onChange={(e) => {
            setOtp(e.target.value.replace(/\D/g, "").slice(0, 4));
            setError("");
          }}
          placeholder="4-digit OTP"
          inputMode="numeric"
          className={`${inputClass} flex-1`}
        />
        <button
          onClick={submit}
          disabled={otp.length !== 4}
          className="shrink-0 rounded-xl bg-rose-500 disabled:bg-slate-300 text-white text-sm font-bold px-4 active:scale-95 transition"
        >
          Release
        </button>
      </div>
      {error && <div className="text-xs text-rose-600 font-medium mt-1">{error}</div>}
      <button onClick={() => onMissed(parcel.id)} className="text-[11px] text-slate-400 underline mt-1.5">
        Receiver not here — hold for redelivery
      </button>
    </div>
  );
}

export default function ConductorView({
  route,
  bus,
  buses,
  onSelectBus,
  parcels,
  stopIndex,
  setStopIndex,
  offline,
  setOffline,
  pendingCount,
  onCollect,
  onRelease,
  onMissed,
}) {
  const stops = route.stops;
  const stop = stops[stopIndex];

  const onThisBus = (p) => p.busId === bus.id;

  const toCollect = parcels.filter(
    (p) => onThisBus(p) && p.state === PARCEL_STATES.BOOKED && p.originStopId === stop.id,
  );
  const toRelease = parcels.filter(
    (p) => onThisBus(p) && p.state === PARCEL_STATES.IN_TRANSIT && p.destinationStopId === stop.id,
  );
  const aboard = parcels.filter((p) => onThisBus(p) && p.state === PARCEL_STATES.IN_TRANSIT && !toRelease.includes(p));

  return (
    <div className="space-y-3">
      <Card className="p-4 sm:p-5">
        <select
          value={bus.id}
          onChange={(e) => onSelectBus(e.target.value)}
          className={`${inputClass} font-semibold mb-3`}
        >
          {buses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.id} · {b.departureLabel} — {b.conductorName}
            </option>
          ))}
        </select>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Route</div>
            <div className="font-bold text-slate-800">{route.name}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Conductor</div>
            <div className="font-bold text-slate-800">{bus.conductorName}</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
          <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${offline ? "bg-slate-400" : "bg-emerald-500"}`} />
            {offline ? "Offline" : "Online"}
          </span>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="text-xs font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                {pendingCount} pending
              </span>
            )}
            <button
              onClick={() => setOffline(!offline)}
              className={`relative w-11 h-6 rounded-full transition ${offline ? "bg-slate-300" : "bg-emerald-500"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  offline ? "translate-x-0.5" : "translate-x-5"
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => setStopIndex(Math.max(0, stopIndex - 1))}
            disabled={stopIndex === 0}
            className="text-slate-400 disabled:opacity-30 font-bold text-lg px-2"
          >
            ‹
          </button>
          <div className="text-center">
            <div className="text-xs text-slate-400">Current stop</div>
            <div className="text-lg font-extrabold text-slate-900">{stop.name}</div>
          </div>
          <button
            onClick={() => setStopIndex(Math.min(stops.length - 1, stopIndex + 1))}
            disabled={stopIndex === stops.length - 1}
            className="text-slate-400 disabled:opacity-30 font-bold text-lg px-2"
          >
            ›
          </button>
        </div>
        <div className="flex justify-center gap-1 mt-2">
          {stops.map((s, i) => (
            <span
              key={s.id}
              className={`h-1.5 rounded-full transition-all ${
                i === stopIndex ? "w-5 bg-rose-500" : i < stopIndex ? "w-1.5 bg-rose-300" : "w-1.5 bg-slate-200"
              }`}
            />
          ))}
        </div>
      </Card>

      <div className="sm:grid sm:grid-cols-2 sm:gap-3 space-y-3 sm:space-y-0">
        <Card className="p-4 sm:p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Collect from sender</h3>
          {toCollect.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">Nobody waiting to hand off here.</p>
          ) : (
            toCollect.map((p) => <CollectRow key={p.id} parcel={p} onAction={() => onCollect(p.id)} />)
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Release to receiver</h3>
          {toRelease.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">Nobody waiting to collect here.</p>
          ) : (
            toRelease.map((p) => (
              <ReleaseRow key={p.id} parcel={p} onRelease={onRelease} onMissed={onMissed} />
            ))
          )}
        </Card>
      </div>

      {aboard.length > 0 && (
        <Card className="p-4 sm:p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Aboard, upcoming</h3>
          {aboard.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 text-sm border-b border-slate-100 last:border-0">
              <span className="font-medium text-slate-700 flex items-center gap-1.5">
                {p.id}
                {p.missed && <span className="text-[10px] font-bold text-amber-600">↺</span>}
              </span>
              <span className="text-xs text-slate-400">→ {route.stops.find((s) => s.id === p.destinationStopId)?.name}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
