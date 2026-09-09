import { QRCodeSVG } from "qrcode.react";

/**
 * Renders a real, scannable QR code for a parcel id. There is no camera in
 * this prototype -- "scanning" elsewhere in the app is a button that looks
 * up the parcel by id directly -- but the QR itself is genuine so it reads
 * correctly if photographed or scanned with an external app.
 */
export default function QrBlock({ value, size = 120, label }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
        <QRCodeSVG value={value} size={size} level="M" />
      </div>
      {label && <span className="text-xs font-mono text-slate-500">{label}</span>}
    </div>
  );
}
