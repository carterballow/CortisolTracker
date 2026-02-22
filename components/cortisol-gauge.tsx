"use client"

import React, { useMemo } from "react"

type Props = {
  percentVsAvgNow: number
  clampPct?: number
}

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x))
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (Math.PI / 180) * deg
  // SVG y-axis is downward, so subtract sin term
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }
}

// Correct donut segment: outer arc CW, inner arc CCW (or vice versa)
function donutSegment(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startDeg: number,
  endDeg: number
) {
  const p1 = polar(cx, cy, rOuter, startDeg)
  const p2 = polar(cx, cy, rOuter, endDeg)
  const p3 = polar(cx, cy, rInner, endDeg)
  const p4 = polar(cx, cy, rInner, startDeg)

  // for our semicircle segments, this will never be a "large arc"
  const largeArc = 0

  // sweep outer arc from start -> end
  const sweepOuter = endDeg < startDeg ? 1 : 0
  // sweep inner arc back from end -> start (reverse direction)
  const sweepInner = sweepOuter ? 0 : 1

  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} ${sweepOuter} ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} ${sweepInner} ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ")
}

export function CortisolGauge({ percentVsAvgNow, clampPct = 50 }: Props) {
  const W = 360
  const H = 220
  const cx = W / 2
  const cy = 165
  const rOuter = 120
  const rInner = 78

  // ✅ Correct direction:
  // -clamp -> left (180°), 0 -> middle (90°), +clamp -> right (0°)
  const needleDeg = useMemo(() => {
    const p = clamp(percentVsAvgNow, -clampPct, clampPct)
    const t = (p + clampPct) / (2 * clampPct) // 0..1
    return 180 - t * 180
  }, [percentVsAvgNow, clampPct])

  // segments across top semicircle from left(180) -> right(0)
  const segments = [
    { a0: 180, a1: 144, fill: "#22c55e" }, // green
    { a0: 144, a1: 108, fill: "#a3e635" }, // light green
    { a0: 108, a1: 72, fill: "#facc15" },  // yellow
    { a0: 72, a1: 36, fill: "#fb923c" },   // orange
    { a0: 36, a1: 0, fill: "#ef4444" },    // red
  ]

  const needleTip = polar(cx, cy, rOuter - 12, needleDeg)

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[560px] mx-auto"
        role="img"
        aria-label="Cortisol gauge"
      >
        {/* Segments */}
        {segments.map((s, i) => (
          <path
            key={i}
            d={donutSegment(cx, cy, rOuter, rInner, s.a0, s.a1)}
            fill={s.fill}
            stroke="white"
            strokeWidth="4"
          />
        ))}

        {/* Labels */}
        <text x={cx - rOuter + 10} y={42} fontSize="18" textAnchor="start" fill="#111827">
          LOW
        </text>
        <text x={cx} y={28} fontSize="20" textAnchor="middle" fill="#111827">
          NORMAL
        </text>
        <text x={cx + rOuter - 10} y={42} fontSize="18" textAnchor="end" fill="#111827">
          HIGH
        </text>

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke="#111827"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Hub */}
        <circle cx={cx} cy={cy} r="18" fill="#111827" />
        <circle cx={cx} cy={cy} r="8" fill="#f9fafb" opacity="0.95" />

        {/* Caption */}
        <text x={cx} y={H - 10} fontSize="14" textAnchor="middle" fill="#6b7280">
          Needle reflects Current vs Average at this time.
        </text>
      </svg>

      <div className="mt-1 text-center text-xs text-muted-foreground">
        {percentVsAvgNow > 0 ? "+" : ""}
        {percentVsAvgNow.toFixed(1)}% vs avg now
      </div>
    </div>
  )
}