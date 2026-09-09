import { useEffect, useRef, useState } from "react";

// Bus glyph as a small inline SVG group, rotated to face travel direction.
function BusIcon({ x, y, angle }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <circle r="11" fill="#0f172a" opacity="0.12" />
      <g transform="translate(-8 -6)">
        <rect x="0" y="0" width="16" height="11" rx="2.5" fill="#e11d48" />
        <rect x="2" y="2" width="4.5" height="3.5" rx="0.6" fill="#fecdd3" />
        <rect x="9" y="2" width="4.5" height="3.5" rx="0.6" fill="#fecdd3" />
        <circle cx="3.5" cy="11" r="1.6" fill="#1e293b" />
        <circle cx="12.5" cy="11" r="1.6" fill="#1e293b" />
      </g>
    </g>
  );
}

/**
 * Draws a route as a static SVG path and animates a bus icon along it using
 * path.getPointAtLength(). A booking can start and end at ANY stop on the
 * route -- not just the two ends -- so this takes `fromPos`/`toPos` (0..1
 * positions of this specific booking's stops) rather than assuming the
 * whole path. `progress` is 0..1 of *this booking's* trip: 0 = just handed
 * to the conductor at the origin stop, 1 = arriving at the destination
 * stop. The "traveled" overlay is built by sampling points along the real
 * path between the origin stop and the bus's current position, so it's
 * always geometrically exact regardless of direction.
 */
export default function RouteMap({ pathD, viewBox, stops, fromPos, toPos, progress, originLabel, destinationLabel }) {
  const pathRef = useRef(null);
  const [totalLength, setTotalLength] = useState(0);

  useEffect(() => {
    if (pathRef.current) {
      setTotalLength(pathRef.current.getTotalLength());
    }
  }, [pathD]);

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const forward = toPos >= fromPos;
  const sampleFraction = (t) => fromPos + t * (toPos - fromPos);

  let busPoint = null;
  let busAngle = 0;
  let traveledD = "";
  const stopPoints = [];

  if (pathRef.current && totalLength > 0) {
    const p = pathRef.current;
    const at = (t) => p.getPointAtLength(Math.max(0, Math.min(1, sampleFraction(t))) * totalLength);

    const eps = 0.01;
    busPoint = at(clampedProgress);
    const behind = at(clampedProgress - eps);
    const ahead = at(clampedProgress + eps);
    busAngle = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI;

    // Sample the real path between the origin stop and the bus's current
    // position to build an exact "traveled so far" overlay.
    const lenA = fromPos * totalLength;
    const lenB = sampleFraction(clampedProgress) * totalLength;
    const lo = Math.min(lenA, lenB);
    const hi = Math.max(lenA, lenB);
    if (hi > lo) {
      const samples = 40;
      const pts = [];
      for (let i = 0; i <= samples; i++) {
        const len = lo + (hi - lo) * (i / samples);
        pts.push(p.getPointAtLength(len));
      }
      traveledD = "M " + pts.map((pt) => `${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join(" L ");
    }

    const lo01 = Math.min(fromPos, toPos);
    const hi01 = Math.max(fromPos, toPos);
    for (const stop of stops) {
      if (stop.pos < lo01 - 1e-9 || stop.pos > hi01 + 1e-9) continue; // not part of this trip
      const pt = p.getPointAtLength(stop.pos * totalLength);
      const passed = forward ? sampleFraction(clampedProgress) >= stop.pos : sampleFraction(clampedProgress) <= stop.pos;
      stopPoints.push({ ...stop, x: pt.x, y: pt.y, passed });
    }
  }

  return (
    <svg
      viewBox={viewBox}
      className="w-full h-full"
      role="img"
      aria-label={`Route map from ${originLabel} to ${destinationLabel}`}
    >
      {/* full road, faint */}
      <path
        ref={pathRef}
        d={pathD}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* traveled portion of THIS booking's segment, sampled exactly */}
      {traveledD && (
        <path d={traveledD} fill="none" stroke="#f43f5e" strokeWidth="4" strokeLinecap="round" />
      )}

      {stopPoints.map((s) => (
        <g key={s.id}>
          <circle
            cx={s.x}
            cy={s.y}
            r={s.kind === "town" ? 6 : 4.5}
            fill={s.passed ? "#f43f5e" : "#ffffff"}
            stroke={s.passed ? "#f43f5e" : "#94a3b8"}
            strokeWidth="2"
          />
          {s.passed && s.kind !== "town" && (
            <path
              d={`M ${s.x - 1.8} ${s.y} l 1.2 1.4 l 2.4 -2.8`}
              stroke="white"
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          <text
            x={s.x}
            y={s.kind === "town" ? s.y - 12 : s.y + (s.pos < 0.5 ? -10 : 14)}
            textAnchor="middle"
            fontSize={s.kind === "town" ? 10.5 : 8.5}
            fontWeight={s.kind === "town" ? 700 : 500}
            fill={s.kind === "town" ? "#0f172a" : s.passed ? "#f43f5e" : "#94a3b8"}
          >
            {s.name}
          </text>
        </g>
      ))}

      {busPoint && <BusIcon x={busPoint.x} y={busPoint.y} angle={busAngle} />}
    </svg>
  );
}
