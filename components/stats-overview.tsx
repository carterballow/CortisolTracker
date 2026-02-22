"use client"

import { useEffect, useState } from "react"
import { TrendingDown, Clock, TrendingUp, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CortisolGauge } from "@/components/cortisol-gauge"

type HomePrediction = {
  date: string
  wakeUgdl: number
  currentUgdl: number
  averageUgdlToday: number
  peakUgdlToday: number
  avgNationalNow: number
  percentVsAvgNow: number
  inNationalRangeNow: boolean
  bandLow: number
  bandHigh: number
  error?: string
}

export function StatsOverview() {
  const [data, setData] = useState<HomePrediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          setLoading(true)
          setErr(null)

          const res = await fetch("/api/chat/prediction?days=1", { cache: "no-store" })
          const json = (await res.json()) as HomePrediction

          if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`)

          if (!cancelled) setData(json)
        } catch (e) {
          if (!cancelled) {
            setErr(e instanceof Error ? e.message : "Failed to load prediction")
            setData(null)
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()

    return () => {
      cancelled = true
    }
  }, [])

  const topValue =
    loading ? "…" : err ? "--" : data ? data.currentUgdl.toFixed(2) : "--"

  const topSub =
    loading
      ? "Loading Fitbit-based estimate…"
      : err
        ? err
        : data
          ? `${data.inNationalRangeNow ? "Normal" : "Outside"} • ${data.percentVsAvgNow > 0 ? "+" : ""}${data.percentVsAvgNow.toFixed(1)}% vs avg now`
          : "—"

  const stats = [
    {
      title: "Average",
      value: loading ? "…" : err ? "--" : data ? data.averageUgdlToday.toFixed(2) : "--",
      unit: "mcg/dL",
      description: "Today (estimated from curve)",
      icon: TrendingDown,
    },
    {
      title: "Wake",
      value: loading ? "…" : err ? "--" : data ? data.wakeUgdl.toFixed(2) : "--",
      unit: "mcg/dL",
      description: "Model prediction at wake",
      icon: Clock,
    },
    {
      title: "Current vs Average",
      value:
        loading ? "…" : err ? "--" : data ? `${data.percentVsAvgNow > 0 ? "+" : ""}${data.percentVsAvgNow.toFixed(1)}%` : "--",
      unit: "",
      description: data ? `Avg now: ${data.avgNationalNow.toFixed(2)} mcg/dL` : "—",
      icon: TrendingUp,
    },
    {
      title: "Normal Range",
      value: loading ? "…" : err ? "--" : data ? (data.inNationalRangeNow ? "Yes" : "No") : "--",
      unit: "",
      description: data
        ? `Now band: ${data.bandLow.toFixed(2)}–${data.bandHigh.toFixed(2)} • Peak: ${data.peakUgdlToday.toFixed(2)}`
        : "—",
      icon: Activity,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Top "Current" header */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Cortisol</h3>
          <span className="text-xs text-muted-foreground">Fitbit-based</span>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-bold tabular-nums">{topValue}</span>
          <span className="text-sm text-muted-foreground">mcg/dL</span>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">{topSub}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Model estimate (experimental). Use trends over time, not a single moment.
        </p>
        {!loading && !err && data ? (
          <div className="mt-4">
            <CortisolGauge
              percentVsAvgNow={data.percentVsAvgNow}
              label={data.inNationalRangeNow ? "NORMAL" : data.percentVsAvgNow < 0 ? "LOW" : "HIGH"}
              clampPct={50}
            />
          </div>
        ) : null}
      </div>

      {/* Four cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight">{stat.value}</span>
                {stat.unit && <span className="text-sm text-muted-foreground">{stat.unit}</span>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}