import { useEffect } from "react";

export function DemoBanner({ onWatch, onDismiss }) {
  return (
    <div className="bg-rose-500 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3">
        <span className="text-xs sm:text-sm font-semibold flex-1 min-w-0 truncate">
          🎬 See how it works — 2 min demo
        </span>
        <button
          onClick={onWatch}
          className="text-xs font-bold bg-white text-rose-600 rounded-full px-3 py-1.5 shrink-0 active:scale-95 transition"
        >
          Watch demo
        </button>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-white/70 hover:text-white text-lg leading-none shrink-0 px-1"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function DemoModal({ onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-white text-sm font-semibold">inbus — demo</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-white/70 hover:text-white text-xl leading-none px-1"
          >
            ×
          </button>
        </div>
        <video src="/demo.webm" controls autoPlay muted className="w-full block bg-black" />
      </div>
    </div>
  );
}
