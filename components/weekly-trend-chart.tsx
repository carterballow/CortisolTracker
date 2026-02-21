"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type CortisolReading } from "@/lib/cortisol-data"

interface WeeklyTrendChartProps {
  readings: CortisolReading[]
}

export function WeeklyTrendChart({ readings }: WeeklyTrendChartProps) {
  const dateMap = new Map<string, number[]>()

  for (const reading of readings) {
    const existing = dateMap.get(reading.date) || []
    existing.push(reading.value)
    dateMap.set(reading.date, existing)
  }

  const chartData = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([date, values]) => {
      const avg = Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10
      const max = Math.max(...values)
      const min = Math.min(...values)
      const displayDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      return { date: displayDate, avg, max, min }
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>7-Day Trend</CardTitle>
        <CardDescription>Average, peak, and lowest cortisol each day</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
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
                domain={[0, "auto"]}
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
              <Line
                type="monotone"
                dataKey="max"
                stroke="oklch(0.65 0.18 30)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                name="Peak"
              />
              <Line
                type="monotone"
                dataKey="avg"
                stroke="oklch(0.55 0.15 200)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "oklch(0.55 0.15 200)", strokeWidth: 2, stroke: "oklch(1 0 0)" }}
                activeDot={{ r: 6 }}
                name="Average"
              />
              <Line
                type="monotone"
                dataKey="min"
                stroke="oklch(0.7 0.12 165)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                name="Lowest"
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
