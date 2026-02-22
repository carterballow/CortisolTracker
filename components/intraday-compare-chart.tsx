"use client"

import { useMemo } from "react"
import {
    ResponsiveContainer,
    ComposedChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts"
import { type CortisolReading } from "@/lib/cortisol-data"

function median(nums: number[]) {
    if (nums.length === 0) return 0
    const sorted = [...nums].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2
}

function estimateBaselineRestingHR(hrValues: number[]) {
    if (hrValues.length === 0) return 60

    // sort lowest → highest
    const sorted = [...hrValues].sort((a, b) => a - b)

    // take lowest 20% (approx resting periods)
    const count = Math.max(5, Math.floor(sorted.length * 0.2))
    const lowest = sorted.slice(0, count)

    return median(lowest)
}

type IntradayPoint = { time: string; value: number }

interface Props {
    selectedDate: string
    readings: CortisolReading[]
    heartRate: IntradayPoint[]
    steps: IntradayPoint[]
}

// Map cortisol buckets to approximate times
const bucketToTime: Record<CortisolReading["timeOfDay"], string> = {
    morning: "08:00",
    midday: "12:00",
    afternoon: "15:00",
    evening: "19:00",
    night: "23:00",
}

export function IntradayCompareChart({
    selectedDate,
    readings,
    heartRate,
    steps,
}: Props) {
    const { data, cortisolCount } = useMemo(() => {
        // full 24h timeline
        const rows: { time: string; hrPct?: number; steps?: number; cortisol?: number }[] = []
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m++) {
                const hh = String(h).padStart(2, "0")
                const mm = String(m).padStart(2, "0")
                rows.push({ time: `${hh}:${mm}` })
            }
        }

        const index = new Map<string, number>()
        rows.forEach((r, i) => index.set(r.time, i))

        // HR % above baseline
        const hrValues = heartRate.map((p) => p.value).filter((v) => Number.isFinite(v))
        const baselineHR = estimateBaselineRestingHR(hrValues)

        for (const p of heartRate) {
            const key = p.time.slice(0, 5)
            const i = index.get(key)
            if (i !== undefined) {
                rows[i].hrPct = baselineHR ? ((p.value / baselineHR) - 1) * 100 : 0
            }
        }

        // Steps
        for (const p of steps) {
            const key = p.time.slice(0, 5)
            const i = index.get(key)
            if (i !== undefined) rows[i].steps = p.value
        }

        // Cortisol (as intraday points)
        const todays = readings.filter((r) => r.date === selectedDate)
        console.log("selectedDate:", selectedDate)
        console.log("todays cortisol readings:", todays)
        let count = 0
        for (const r of todays) {
            const approx = bucketToTime[r.timeOfDay]
            const i = index.get(approx)
            if (i !== undefined) {
                rows[i].cortisol = r.value
                count++
            }
        }

        return { data: rows, cortisolCount: count }
    }, [heartRate, steps, readings, selectedDate])

    const hasAny =
        data.some((d) => d.hrPct !== undefined) ||
        data.some((d) => d.steps !== undefined) ||
        data.some((d) => d.cortisol !== undefined)

    if (!hasAny) {
        return (
            <div className="text-sm text-muted-foreground">
                No intraday chart data available for this date.
            </div>
        )
    }

    return (
        <div className="w-full">
            {/* quick debug line so you can confirm cortisol is being found */}
            <div className="mb-2 text-xs text-muted-foreground">
                Cortisol readings on {selectedDate}: {cortisolCount}
            </div>

            <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis
                            dataKey="time"
                            interval={59} // show hourly labels
                            tickFormatter={(t) => t}
                        />

                        {/* Left axis: HR + Cortisol */}
                        <YAxis
                            yAxisId="left"
                            domain={[-20, 120]}
                            tickFormatter={(v) => `${Math.round(v)}%`}
                        />
                        {/* Right axis: Steps */}
                        <YAxis yAxisId="right" orientation="right" />

                        <Tooltip
                            formatter={(value: any, name: any) => {
                                if (name === "HR vs Resting (%)") return [`${Math.round(value)}%`, name]
                                if (name === "Steps") return [`${value}`, name]
                                if (name === "Cortisol") return [`${value}`, name]
                                return [value, name]
                            }}
                            labelFormatter={(label) => `Time: ${label}`}
                        />
                        <Legend />

                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="hrPct"
                            name="HR vs Resting (%)"
                            dot={false}
                        />
                        <Line yAxisId="right" type="monotone" dataKey="steps" name="Steps" dot={false} />

                        {/* ✅ Cortisol as a LINE with dots; connectNulls links the sparse points */}
                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="cortisol"
                            name="Cortisol"
                            dot
                            connectNulls
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}