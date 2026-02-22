"use client"

import { useEffect, useMemo, useState } from "react"

type Prediction = {
  date: string
  predicted_wake_cortisol_norm: number
  predicted_wake_cortisol_ug_dL: number
  percent_vs_national_avg: number
  level: "Low" | "Normal" | "High" | string
}

type PredictionResponse = {
  predictions: Prediction[]
  average_predicted_wake_cortisol_ug_dL: number | null
  used_days: number
  end_date: string
  error?: string
}

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

export function PredictionOverview() {
  const [data, setData] = useState<PredictionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        setLoading(true)
        setErr(null)

        const res = await fetch(`/api/chat/prediction?days=7&date=${encodeURIComponent(isoToday())}`, {
          cache: "no-store",
        })

        const json = (await res.json()) as PredictionResponse

        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`)

        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Failed to load predictions")
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

  const todayPred = useMemo(() => {
    if (!data?.predictions?.length) return null
    const today = isoToday()
    return data.predictions.find((p) => p.date === today) ?? data.predictions[data.predictions.length - 1]
  }, [data])

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Cortisol</h3>
        <span className="text-xs text-muted-foreground">Fitbit-based</span>
      </div>

      {loading ? (
        <p className="mt-2 text-sm text-muted-foreground">Loading predictions…</p>
      ) : err ? (
        <p className="mt-2 text-sm text-red-600">{err}</p>
      ) : !todayPred ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No prediction available yet. (Need Fitbit intraday + sleep data.)
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-bold tabular-nums">
                {todayPred.predicted_wake_cortisol_ug_dL.toFixed(2)}
                <span className="ml-1 text-base font-medium text-muted-foreground">µg/dL</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {todayPred.level} • {todayPred.percent_vs_national_avg > 0 ? "+" : ""}
                {todayPred.percent_vs_national_avg}% vs national avg
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-muted-foreground">7-day avg</p>
              <p className="text-lg font-semibold tabular-nums">
                {data?.average_predicted_wake_cortisol_ug_dL == null
                  ? "—"
                  : data.average_predicted_wake_cortisol_ug_dL.toFixed(2)}
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Model estimate (experimental). Use trends over time, not a single day.
          </p>
        </>
      )}
    </div>
  )
}