import { useState } from "react";
import TrackingScreen from "./TrackingScreen";
import { Card, Field, PrimaryButton, SecondaryButton, StatusBadge, inputClass } from "./ui";
import { formatDuration, segmentFare, segmentDuration } from "../lib/route";
import { allStops, findRouteByStopNames, busesForRoute, routeById, busById, stopInRoute } from "../lib/seedData";

function RouteSearchForm({ onSearch }) {
  const stops = allStops();
  const [fromName, setFromName] = useState("");
  const [toName, setToName] = useState("");
  const valid = fromName && toName && fromName !== toName;

  return (
    <Card className="p-4 sm:p-6 space-y-3">
      <h2 className="text-lg font-extrabold text-slate-900">Send a parcel</h2>
      <p className="text-xs text-slate-400 -mt-2">
        Peer-to-peer over the bus network — no shops. Pick the two bus stops where you and the receiver will meet the conductor.
      </p>

      <Field label="From (your stop)">
        <select value={fromName} onChange={(e) => setFromName(e.target.value)} className={inputClass}>
          <option value="">Select stop</option>
          {stops.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="To (receiver's stop)">
        <select value={toName} onChange={(e) => setToName(e.target.value)} className={inputClass}>
          <option value="">Select stop</option>
          {stops.filter((s) => s.name !== fromName).map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>

      <PrimaryButton disabled={!valid} onClick={() => onSearch(fromName, toName)}>
        Search buses
      </PrimaryButton>
    </Card>
  );
}

function BusResults({ fromName, toName, onBack, onSelect }) {
  const found = findRouteByStopNames(fromName, toName);
  const buses = found ? busesForRoute(found.route.id) : [];

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-sm font-semibold text-slate-500">
        ‹ Change stops
      </button>
      <Card className="p-4 sm:p-6">
        <div className="text-xs text-slate-400">Stops</div>
        <div className="text-base font-extrabold text-slate-900">
          {fromName} → {toName}
        </div>
      </Card>

      {buses.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm font-semibold text-slate-600">No buses cover both stops on one route yet.</p>
          <p className="text-xs text-slate-400 mt-1">Try Nainital ↔ Almora or Nainital ↔ Ranikhet.</p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {buses.map((b) => {
            const price = segmentFare(b, found.fromStop.pos, found.toStop.pos);
            const duration = segmentDuration(b, found.fromStop.pos, found.toStop.pos);
            return (
              <Card key={b.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{b.departureLabel}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
                      {b.type}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {b.id} · {b.conductorName} · {formatDuration(duration)} for this hop
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-rose-600">₹{price}</div>
                  <button
                    onClick={() => onSelect({ ...b, price, durationMinutes: duration }, found)}
                    className="mt-1 rounded-lg bg-rose-500 text-white text-xs font-bold px-3 py-1.5 active:scale-95 transition"
                  >
                    Select
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ParcelDetailsForm({ fromStop, toStop, bus, onBack, onSubmit }) {
  const [form, setForm] = useState({
    description: "",
    declaredContents: "",
    declaredValue: "",
    receiverName: "",
    receiverPhone: "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const valid = form.description && form.receiverName && form.receiverPhone.length >= 10;

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-sm font-semibold text-slate-500">
        ‹ Change bus
      </button>
      <Card className="p-4 sm:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-900">Parcel details</h2>
          <div className="text-right">
            <div className="text-[10px] text-slate-400">{bus.departureLabel} · {bus.id}</div>
            <div className="font-extrabold text-rose-600">₹{bus.price}</div>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">You meet the conductor at</div>
            <div className="font-semibold text-slate-800">{fromStop.name} stop</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Receiver meets at</div>
            <div className="font-semibold text-slate-800">{toStop.name} stop</div>
          </div>
        </div>

        <Field label="Description">
          <input
            value={form.description}
            onChange={set("description")}
            placeholder="e.g. Small carton, medicines"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Declared contents">
            <input
              value={form.declaredContents}
              onChange={set("declaredContents")}
              placeholder="e.g. 2 strips of tablets"
              className={inputClass}
            />
          </Field>
          <Field label="Declared value (₹)">
            <input
              value={form.declaredValue}
              onChange={set("declaredValue")}
              type="number"
              min="0"
              placeholder="1000"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Receiver's name">
            <input value={form.receiverName} onChange={set("receiverName")} className={inputClass} />
          </Field>
          <Field label="Receiver's phone">
            <input
              value={form.receiverPhone}
              onChange={(e) => setForm((f) => ({ ...f, receiverPhone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
              inputMode="numeric"
              className={inputClass}
            />
          </Field>
        </div>

        <PrimaryButton disabled={!valid} onClick={() => onSubmit(form)}>
          Continue
        </PrimaryButton>
      </Card>
    </div>
  );
}

function PaymentChoice({ form, fromStop, toStop, bus, onBack, onConfirm, paying }) {
  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-sm font-semibold text-slate-500" disabled={paying}>
        ‹ Back
      </button>
      <Card className="p-4 sm:p-6 space-y-4">
        <h2 className="text-lg font-extrabold text-slate-900">Payment</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Stops</span>
            <span className="font-medium text-slate-700 text-right">
              {fromStop.name} → {toStop.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Bus</span>
            <span className="font-medium text-slate-700">{bus.departureLabel} · {bus.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Parcel</span>
            <span className="font-medium text-slate-700">{form.description}</span>
          </div>
          <div className="h-px bg-slate-100 my-2" />
          <div className="flex justify-between text-base">
            <span className="font-bold text-slate-900">Delivery fee</span>
            <span className="font-extrabold text-rose-600">₹{bus.price}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PrimaryButton disabled={paying} onClick={() => onConfirm("PAID")}>
            {paying === "PAID" ? "Processing…" : `Pay ₹${bus.price} now`}
          </PrimaryButton>
          <SecondaryButton disabled={paying} onClick={() => onConfirm("COD")}>
            {paying === "COD" ? "Confirming…" : "Pay at pickup"}
          </SecondaryButton>
        </div>
        <p className="text-[11px] text-slate-400 text-center">
          "Pay now" is a mock payment screen — no real gateway is connected. "Pay at pickup" means cash to the conductor when they collect the parcel from you.
        </p>
      </Card>
    </div>
  );
}

export default function SenderView({ parcels, busProgress, onBook, defaultParcelId }) {
  const [screen, setScreen] = useState("track"); // 'list' | 'search' | 'results' | 'details' | 'payment' | 'track'
  const [search, setSearch] = useState(null); // { fromName, toName }
  const [selection, setSelection] = useState(null); // { bus, route, fromStop, toStop }
  const [details, setDetails] = useState(null);
  const [paying, setPaying] = useState(false);
  const [trackedId, setTrackedId] = useState(defaultParcelId);

  function startBooking() {
    setSearch(null);
    setSelection(null);
    setDetails(null);
    setScreen("search");
  }

  function handlePay(method) {
    setPaying(method);
    setTimeout(
      () => {
        const newId = onBook({
          ...details,
          busId: selection.bus.id,
          originStopId: selection.fromStop.id,
          destinationStopId: selection.toStop.id,
          fee: selection.bus.price,
          tripDurationMinutes: selection.bus.durationMinutes,
          paymentMethod: method,
        });
        setTrackedId(newId);
        setPaying(false);
        setScreen("track");
      },
      method === "PAID" ? 900 : 400,
    );
  }

  if (screen === "search") {
    return (
      <RouteSearchForm
        onSearch={(fromName, toName) => {
          setSearch({ fromName, toName });
          setScreen("results");
        }}
      />
    );
  }

  if (screen === "results" && search) {
    return (
      <BusResults
        fromName={search.fromName}
        toName={search.toName}
        onBack={() => setScreen("search")}
        onSelect={(bus, found) => {
          setSelection({ bus, route: found.route, fromStop: found.fromStop, toStop: found.toStop });
          setScreen("details");
        }}
      />
    );
  }

  if (screen === "details" && selection) {
    return (
      <ParcelDetailsForm
        fromStop={selection.fromStop}
        toStop={selection.toStop}
        bus={selection.bus}
        onBack={() => setScreen("results")}
        onSubmit={(form) => {
          setDetails(form);
          setScreen("payment");
        }}
      />
    );
  }

  if (screen === "payment" && selection && details) {
    return (
      <PaymentChoice
        form={details}
        fromStop={selection.fromStop}
        toStop={selection.toStop}
        bus={selection.bus}
        paying={paying}
        onBack={() => setScreen("details")}
        onConfirm={handlePay}
      />
    );
  }

  if (screen === "track" && trackedId) {
    const parcel = parcels.find((p) => p.id === trackedId);
    if (parcel) {
      const route = routeById(parcel.routeId);
      const bus = busById(parcel.busId);
      const originStop = stopInRoute(route, parcel.originStopId);
      const destStop = stopInRoute(route, parcel.destinationStopId);
      return (
        <div className="space-y-3">
          <TrackedHeader onBack={() => setScreen("list")} onNew={startBooking} />
          <TrackingScreen
            parcel={parcel}
            route={route}
            originStop={originStop}
            destStop={destStop}
            progress={busProgress[parcel.id] ?? 0}
            bus={bus}
          />
        </div>
      );
    }
  }

  return (
    <div className="space-y-3">
      <PrimaryButton onClick={startBooking}>+ Book a parcel</PrimaryButton>
      <Card className="p-4 sm:p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-2">My shipments</h3>
        {parcels.length === 0 && <p className="text-xs text-slate-400">No shipments yet.</p>}
        {parcels.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setTrackedId(p.id);
              setScreen("track");
            }}
            className="w-full flex items-center justify-between py-3 border-b border-slate-100 last:border-0 text-left"
          >
            <div>
              <div className="font-semibold text-sm text-slate-800">{p.id}</div>
              <div className="text-xs text-slate-400">{p.description}</div>
            </div>
            <StatusBadge state={p.state} />
          </button>
        ))}
      </Card>
    </div>
  );
}

function TrackedHeader({ onBack, onNew }) {
  return (
    <div className="flex items-center justify-between">
      <button onClick={onBack} className="text-sm font-semibold text-slate-500">
        ‹ My shipments
      </button>
      <button onClick={onNew} className="text-sm font-semibold text-rose-600">
        + New
      </button>
    </div>
  );
}
