"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

type Point = {
  hour: number
  avg: number
  you: number
}

function refMultiplier(h: number) {
  // "Average" cortisol shape relative to wake (hour 0)
  // - small morning bump around 0.5h (CAR)
  // - then decays through day
  const carPeakHour = 0.5
  const carWidth = 0.6
  const carBump = 0.35 * Math.exp(-Math.pow((h - carPeakHour) / carWidth, 2))

  const decay = Math.exp(-h / 8.0)
  const floor = 0.15

  const raw = floor + (1 - floor) * decay + carBump

  // Normalize so multiplier(0) == 1
  const atWake = floor + (1 - floor) * 1 + 0.35 * Math.exp(-Math.pow((0 - carPeakHour) / carWidth, 2))
  return raw / atWake
}

function buildCurve(yourWake: number, avgWake = 10, hours = 16): Point[] {
  const scale = avgWake > 0 ? yourWake / avgWake : 1
  const pts: Point[] = []
  for (let h = 0; h <= hours; h++) {
    const m = refMultiplier(h)
    const avg = avgWake * m
    const you = avgWake * scale * m
    pts.push({
      hour: h,
      avg: Math.round(avg * 100) / 100,
      you: Math.round(you * 100) / 100,
    })
  }
  return pts
}

export function DiurnalCompareChart({
  yourWakeUgdl,
  avgWakeUgdl = 10,
}: {
  yourWakeUgdl: number
  avgWakeUgdl?: number
}) {
  const data = buildCurve(yourWakeUgdl, avgWakeUgdl, 16)

  return (
    <div className="mt-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Estimated Daily Curve</h3>
          <p className="text-sm text-muted-foreground">
            Average curve scaled to your predicted wake level
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          Wake avg assumed: {avgWakeUgdl} mcg/dL
        </div>
      </div>

      <div className="mt-3 h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="hour"
              tickFormatter={(h) => `${h}h`}
              fontSize={12}
            />
            <YAxis fontSize={12} />
            <Tooltip
              formatter={(value: any) => [`${value} mcg/dL`, ""]}
              labelFormatter={(label) => `Hour since wake: ${label}`}
            />
            <Line type="monotone" dataKey="avg" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="you" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        This is an *estimated* curve for comparison/education (not measured cortisol).
      </p>
    </div>
  )
}