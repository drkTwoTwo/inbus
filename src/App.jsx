import { useEffect, useRef, useState } from "react";
import { PARCEL_STATES, bookParcel, collectFromSender, releaseToReceiver, markMissed } from "./lib/stateMachine";
import { BUSES, SEED_PARCELS, INITIAL_BUS_PROGRESS, routeById, busById } from "./lib/seedData";
import { TRIP_ANIMATION_SECONDS, TRIP_ANIMATION_CAP, missedSurcharge } from "./lib/route";
import SenderView from "./components/SenderView";
import ConductorView from "./components/ConductorView";
import { DemoBanner, DemoModal } from "./components/DemoPromo";

const ROLES = [
  { id: "sender", label: "Sender" },
  { id: "conductor", label: "Conductor" },
];

export default function App() {
  const [role, setRole] = useState("sender");
  const [parcels, setParcels] = useState(SEED_PARCELS);
  const [busProgress, setBusProgress] = useState(() => ({ ...INITIAL_BUS_PROGRESS }));

  const [showDemoBanner, setShowDemoBanner] = useState(true);
  const [showDemoModal, setShowDemoModal] = useState(false);

  const [conductorBusId, setConductorBusId] = useState(BUSES[0].id);
  const [conductorStopIndex, setConductorStopIndex] = useState(0);
  const [conductorOffline, setConductorOffline] = useState(false);
  const [pendingScans, setPendingScans] = useState([]);

  const conductorBus = busById(conductorBusId);
  const conductorRoute = routeById(conductorBus.routeId);

  const parcelsRef = useRef(parcels);
  useEffect(() => {
    parcelsRef.current = parcels;
  }, [parcels]);

  const nextIdRef = useRef(1000 + SEED_PARCELS.length + 1);

  // Cosmetic bus-position animation for IN_TRANSIT parcels. Never reaches
  // 1.0 on its own -- only an actual "release to receiver" transition marks
  // arrival, so the animation can never contradict the real state.
  useEffect(() => {
    const TICK_MS = 250;
    const step = TICK_MS / (TRIP_ANIMATION_SECONDS * 1000);
    const interval = setInterval(() => {
      setBusProgress((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const p of parcelsRef.current) {
          if (p.state === PARCEL_STATES.IN_TRANSIT) {
            const cur = next[p.id] ?? 0;
            if (cur < TRIP_ANIMATION_CAP) {
              next[p.id] = Math.min(TRIP_ANIMATION_CAP, cur + step);
              changed = true;
            }
          }
        }
        return changed ? next : prev;
      });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, []);

  function tryTransition(fn, parcelId, payload) {
    let result = { ok: false, error: "Parcel not found." };
    setParcels((prev) =>
      prev.map((p) => {
        if (p.id !== parcelId) return p;
        try {
          const updated = fn(p, payload);
          result = { ok: true, parcel: updated };
          return updated;
        } catch (e) {
          result = { ok: false, error: e.message };
          return p;
        }
      }),
    );
    return result;
  }

  // ---- Sender ----
  function handleBook(form) {
    const id = `PCL-${nextIdRef.current}`;
    nextIdRef.current += 1;
    const parcel = bookParcel({
      id,
      senderName: "You",
      senderPhone: "9000000000",
      receiverName: form.receiverName,
      receiverPhone: form.receiverPhone,
      originStopId: form.originStopId,
      destinationStopId: form.destinationStopId,
      routeId: busById(form.busId).routeId,
      busId: form.busId,
      tripDurationMinutes: form.tripDurationMinutes,
      paymentMethod: form.paymentMethod,
      description: form.description,
      declaredValue: Number(form.declaredValue) || 0,
      fee: form.fee,
    });
    setParcels((prev) => [...prev, parcel]);
    return id;
  }

  // ---- Conductor ----
  const TRANSITIONS_BY_TYPE = { collect: collectFromSender, release: releaseToReceiver, missed: markMissed };

  function queueOrApply(type, parcelId, payload) {
    if (conductorOffline) {
      setPendingScans((q) => [
        ...q,
        { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, type, parcelId, payload },
      ]);
    } else {
      tryTransition(TRANSITIONS_BY_TYPE[type], parcelId, payload);
    }
  }

  function conductorCollect(parcelId) {
    const stop = conductorRoute.stops[conductorStopIndex];
    queueOrApply("collect", parcelId, { actorName: conductorBus.conductorName, stopName: stop.name });
  }

  function conductorRelease(parcelId, otpEntered) {
    const parcel = parcelsRef.current.find((p) => p.id === parcelId);
    if (!parcel) return { ok: false, error: "Parcel not found." };
    // OTP is checked locally (it travels with the parcel record already on
    // the device) even offline -- only the resulting custody-log write
    // waits for a signal, same as the "collect" scan.
    if (otpEntered !== parcel.releaseOtp) return { ok: false, error: "Incorrect OTP." };
    const stop = conductorRoute.stops[conductorStopIndex];
    queueOrApply("release", parcelId, {
      actorName: conductorBus.conductorName,
      stopName: stop.name,
      otpEntered,
    });
    return { ok: true };
  }

  function conductorMarkMissed(parcelId) {
    const parcel = parcelsRef.current.find((p) => p.id === parcelId);
    if (!parcel) return;
    const stop = conductorRoute.stops[conductorStopIndex];
    queueOrApply("missed", parcelId, {
      actorName: conductorBus.conductorName,
      stopName: stop.name,
      surcharge: missedSurcharge(parcel.fee),
    });
  }

  function setOffline(nextOffline) {
    if (conductorOffline && !nextOffline && pendingScans.length > 0) {
      const queue = pendingScans;
      setPendingScans([]);
      queue.forEach((item) => {
        tryTransition(TRANSITIONS_BY_TYPE[item.type], item.parcelId, item.payload);
      });
    }
    setConductorOffline(nextOffline);
  }

  function selectConductorBus(busId) {
    setConductorBusId(busId);
    setConductorStopIndex(0);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div>
            <div className="font-black text-slate-900 leading-none text-lg">inbus</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Peer-to-peer bus parcel network</div>
          </div>
          <div className="flex bg-slate-100 rounded-full p-1 text-xs sm:text-sm font-semibold">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`px-3 sm:px-4 py-1.5 rounded-full transition ${
                  role === r.id ? "bg-rose-500 text-white shadow-sm" : "text-slate-500"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {showDemoBanner && (
        <DemoBanner onWatch={() => setShowDemoModal(true)} onDismiss={() => setShowDemoBanner(false)} />
      )}
      {showDemoModal && <DemoModal onClose={() => setShowDemoModal(false)} />}

      <main className="max-w-5xl mx-auto p-4 sm:p-6 pb-10">
        <div className="max-w-xl mx-auto lg:max-w-2xl">
          {role === "sender" && (
            <SenderView
              parcels={parcels}
              busProgress={busProgress}
              onBook={handleBook}
              defaultParcelId="PCL-1001"
            />
          )}
          {role === "conductor" && (
            <ConductorView
              route={conductorRoute}
              bus={conductorBus}
              buses={BUSES}
              onSelectBus={selectConductorBus}
              parcels={parcels}
              stopIndex={conductorStopIndex}
              setStopIndex={setConductorStopIndex}
              offline={conductorOffline}
              setOffline={setOffline}
              pendingCount={pendingScans.length}
              onCollect={conductorCollect}
              onRelease={conductorRelease}
              onMissed={conductorMarkMissed}
            />
          )}
        </div>
      </main>
    </div>
  );
}
