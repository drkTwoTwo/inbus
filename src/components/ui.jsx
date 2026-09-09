import { PARCEL_STATES, STATE_LABELS, STATE_ORDER, stateIndex } from "../lib/stateMachine";

export const STATE_COLORS = {
  [PARCEL_STATES.BOOKED]: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" },
  [PARCEL_STATES.IN_TRANSIT]: { bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500" },
  [PARCEL_STATES.COLLECTED]: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
};

export function StatusBadge({ state, className = "" }) {
  const c = STATE_COLORS[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${c.bg} ${c.text} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {STATE_LABELS[state]}
    </span>
  );
}

export function Stepper({ state }) {
  const idx = stateIndex(state);
  return (
    <div className="flex items-center w-full">
      {STATE_ORDER.map((s, i) => {
        const done = i <= idx;
        const isLast = i === STATE_ORDER.length - 1;
        return (
          <div key={s} className={`flex items-center ${isLast ? "" : "flex-1"}`}>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                  done
                    ? "bg-rose-500 border-rose-500 text-white"
                    : "bg-white border-slate-300 text-slate-400"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={`text-[9px] leading-tight text-center max-w-[54px] ${
                  done ? "text-slate-700 font-medium" : "text-slate-400"
                }`}
              >
                {STATE_LABELS[s]}
              </span>
            </div>
            {!isLast && (
              <div
                className={`h-0.5 flex-1 mx-1 mb-4 rounded ${i < idx ? "bg-rose-500" : "bg-slate-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Card({ className = "", children }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 ${className}`}>
      {children}
    </div>
  );
}

export function PrimaryButton({ className = "", children, ...props }) {
  return (
    <button
      className={`w-full rounded-xl bg-rose-500 text-white font-semibold py-3 active:scale-[0.98] transition disabled:bg-slate-300 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ className = "", children, ...props }) {
  return (
    <button
      className={`w-full rounded-xl bg-slate-100 text-slate-700 font-semibold py-3 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 bg-slate-50";
