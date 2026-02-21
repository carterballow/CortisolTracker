"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type CortisolReading, TIME_SHORT_LABELS, HEALTHY_RANGES } from "@/lib/cortisol-data"

interface DailyCurveChartProps {
  readings: CortisolReading[]
  selectedDate: string
}

const TIME_ORDER = ["morning", "midday", "afternoon", "evening", "night"]

export function DailyCurveChart({ readings, selectedDate }: DailyCurveChartProps) {
  const dayReadings = readings.filter((r) => r.date === selectedDate)

  const chartData = TIME_ORDER.map((time) => {
    const reading = dayReadings.find((r) => r.timeOfDay === time)
    const range = HEALTHY_RANGES[time]
    return {
      time: TIME_SHORT_LABELS[time],
      value: reading?.value ?? null,
      rangeMin: range.min,
      rangeMax: range.max,
    }
  })

  const displayDate = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Cortisol Curve</CardTitle>
        <CardDescription>{displayDate}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="healthyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.7 0.12 165)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="oklch(0.7 0.12 165)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="cortisolGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.55 0.15 200)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.55 0.15 200)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="time"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 25]}
                label={{ value: "mcg/dL", angle: -90, position: "insideLeft", offset: 20, fontSize: 11, fill: "oklch(0.5 0.02 240)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(1 0 0)",
                  border: "1px solid oklch(0.91 0.01 200)",
                  borderRadius: "8px",
                  fontSize: "13px",
                  boxShadow: "0 4px 12px oklch(0 0 0 / 0.08)",
                }}
                labelStyle={{ color: "oklch(0.18 0.02 240)", fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="rangeMax"
                stackId="range"
                stroke="none"
                fill="oklch(0.7 0.12 165 / 0.1)"
                name="Healthy Max"
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="rangeMin"
                stackId="range-min"
                stroke="none"
                fill="none"
                name="Healthy Min"
                connectNulls
              />
              <ReferenceLine y={0} stroke="none" />
              <Area
                type="monotone"
                dataKey="value"
                stroke="oklch(0.55 0.15 200)"
                strokeWidth={2.5}
                fill="url(#cortisolGradient)"
                dot={{ r: 5, fill: "oklch(0.55 0.15 200)", strokeWidth: 2, stroke: "oklch(1 0 0)" }}
                activeDot={{ r: 7, fill: "oklch(0.55 0.15 200)", strokeWidth: 2, stroke: "oklch(1 0 0)" }}
                name="Your Level"
                connectNulls
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
