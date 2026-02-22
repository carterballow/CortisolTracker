"use client"

import { useMemo, useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DailyCurveChart } from "@/components/daily-curve-chart"
import { WeeklyTrendChart } from "@/components/weekly-trend-chart"
import { ReadingsTable } from "@/components/readings-table"
import { type CortisolReading } from "@/lib/cortisol-data"

// ✅ NEW: import the intraday comparison chart (you will create this file next)
import { IntradayCompareChart } from "@/components/intraday-compare-chart"

type SleepDay = { date: string; minutesAsleep: number; efficiency: number }

// ✅ NEW: intraday types
type IntradayPoint = { time: string; value: number }
type IntradayPayload = {
  date: string
  heartRate: IntradayPoint[]
  steps: IntradayPoint[]
  sleepSummary?: SleepDay | null
}

interface TrendsTabProps {
  readings: CortisolReading[]
  onDeleteReading: (id: string) => void
}

export function TrendsTab({ readings, onDeleteReading }: TrendsTabProps) {
  // ✅ Keep your “never empty” default date
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date().toISOString().slice(0, 10)
    return today
  })

  // --- Sleep (existing) ---
  const [sleepDays, setSleepDays] = useState<SleepDay[]>([])
  const [sleepLoading, setSleepLoading] = useState(true)
  const [sleepError, setSleepError] = useState<string | null>(null)

  // ✅ NEW: intraday (Option B)
  const [intraday, setIntraday] = useState<IntradayPayload | null>(null)
  const [intradayLoading, setIntradayLoading] = useState(false)
  const [intradayError, setIntradayError] = useState<string | null>(null)

  // Fetch sleep once
  useEffect(() => {
    let cancelled = false

      ; (async () => {
        try {
          setSleepLoading(true)
          setSleepError(null)

          const res = await fetch("/api/chat/fitbit", { cache: "no-store" })
          if (!res.ok) throw new Error(`Failed to load Fitbit sleep (HTTP ${res.status})`)

          const data = (await res.json()) as { sleepDays?: SleepDay[] }

          if (!cancelled) {
            setSleepDays(Array.isArray(data.sleepDays) ? data.sleepDays : [])
          }
        } catch (err) {
          if (!cancelled) {
            setSleepError(err instanceof Error ? err.message : "Failed to load Fitbit sleep")
            setSleepDays([])
          }
        } finally {
          if (!cancelled) setSleepLoading(false)
        }
      })()

    return () => {
      cancelled = true
    }
  }, [])

  // ✅ NEW: fetch intraday whenever selectedDate changes
  useEffect(() => {
    let cancelled = false

      ; (async () => {
        if (!selectedDate) return

        try {
          setIntradayLoading(true)
          setIntradayError(null)

          const res = await fetch(
            `/api/chat/fitbit?date=${encodeURIComponent(selectedDate)}&include=intraday`,
            { cache: "no-store" }
          )
          if (!res.ok) throw new Error(`Failed to load intraday Fitbit data (HTTP ${res.status})`)

          const data = (await res.json()) as IntradayPayload

          if (!cancelled) {
            setIntraday(data)
          }
        } catch (err) {
          if (!cancelled) {
            setIntradayError(err instanceof Error ? err.message : "Failed to load intraday Fitbit data")
            setIntraday(null)
          }
        } finally {
          if (!cancelled) setIntradayLoading(false)
        }
      })()

    return () => {
      cancelled = true
    }
  }, [selectedDate])

  // Available cortisol dates (only dates that actually have readings)
  const availableDates = useMemo(() => {
    const cortisolDates = readings.map((r) => r.date)
    const fitbitDates = sleepDays.map((d) => d.date) // you already have sleepDays
    return [...new Set([...cortisolDates, ...fitbitDates])].sort()
  }, [readings, sleepDays])
  useEffect(() => {
    if (availableDates.length === 0) return
    if (!selectedDate || !availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates[availableDates.length - 1])
    }
  }, [availableDates, selectedDate])
  // Keep selectedDate valid relative to readings (your existing logic, kept)
  useEffect(() => {
    if (!selectedDate && availableDates.length > 0) {
      setSelectedDate(availableDates[availableDates.length - 1])
      return
    }

    if (selectedDate && availableDates.length > 0 && !availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates[availableDates.length - 1])
    }
  }, [availableDates, selectedDate])

  const navigateDate = (direction: "prev" | "next") => {
    const currentIndex = availableDates.indexOf(selectedDate)

    if (direction === "prev" && currentIndex > 0) {
      setSelectedDate(availableDates[currentIndex - 1])
    } else if (direction === "next" && currentIndex < availableDates.length - 1) {
      setSelectedDate(availableDates[currentIndex + 1])
    }
  }

  const currentDateIndex = availableDates.indexOf(selectedDate)

  const displayDate = selectedDate
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    : "—"

  const selectedSleep = useMemo(
    () => sleepDays.find((d) => d.date === selectedDate),
    [sleepDays, selectedDate]
  )

  const last7Sleep = useMemo(() => {
    if (!sleepDays.length) return []
    const sorted = [...sleepDays].sort((a, b) => b.date.localeCompare(a.date))
    return sorted.slice(0, 7)
  }, [sleepDays])

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Trends</h2>
          <p className="text-sm text-muted-foreground">Analyze your cortisol patterns</p>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => navigateDate("prev")}
            disabled={!selectedDate || currentDateIndex <= 0}
            aria-label="Previous day"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <span className="min-w-[80px] text-center text-sm font-medium tabular-nums">
            {displayDate}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => navigateDate("next")}
            disabled={!selectedDate || currentDateIndex >= availableDates.length - 1}
            aria-label="Next day"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      {/* Date scroller */}
      <div className="rounded-xl border bg-card p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Select Date</h3>
          <span className="text-xs text-muted-foreground">
            {availableDates.length} days
          </span>
        </div>

        {availableDates.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div className="mt-2 flex gap-2 overflow-x-auto whitespace-nowrap pb-2">
            {availableDates.map((d) => {
              const active = d === selectedDate
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={[
                    "rounded-full border px-3 py-1 text-sm tabular-nums transition",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted",
                  ].join(" ")}
                >
                  {new Date(`${d}T12:00:00`).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </button>
              )
            })}
          </div>
        )}
      </div>
      {/* Sleep summary card (keep) */}
      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-semibold">Fitbit Sleep (last 7 days)</h3>

        {selectedSleep && (
          <p className="mt-2 text-sm">
            Selected day: {Math.floor(selectedSleep.minutesAsleep / 60)}h{" "}
            {selectedSleep.minutesAsleep % 60}m • {selectedSleep.efficiency}%
          </p>
        )}

        {sleepLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading Fitbit sleep…</p>
        ) : sleepError ? (
          <p className="mt-2 text-sm text-red-600">{sleepError}</p>
        ) : last7Sleep.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No Fitbit sleep data found.</p>
        ) : (
          <div className="mt-2 space-y-1 text-sm">
            {last7Sleep.map((d) => (
              <div key={d.date} className="flex justify-between">
                <span>{d.date}</span>
                <span className="tabular-nums">
                  {Math.floor(d.minutesAsleep / 60)}h {d.minutesAsleep % 60}m • {d.efficiency}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ✅ NEW: Intraday comparison card */}
      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-semibold">Intraday Comparison</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Heart rate + steps (Fitbit) overlaid with your cortisol readings for the selected date.
        </p>

        {intradayLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading intraday data…</p>
        ) : intradayError ? (
          <p className="mt-2 text-sm text-red-600">{intradayError}</p>
        ) : !intraday ? (
          <p className="mt-2 text-sm text-muted-foreground">No intraday data loaded.</p>
        ) : intraday.heartRate.length === 0 && intraday.steps.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No intraday heart rate / steps found for {selectedDate}. Try a date you have Fitbit intraday exports for.
          </p>
        ) : (
          <div className="mt-3">
            <IntradayCompareChart
              selectedDate={selectedDate}
              readings={readings}
              heartRate={intraday.heartRate}
              steps={intraday.steps}
            />
          </div>
        )}
      </div>

      {/* Daily cortisol curve (keep) */}
      {selectedDate ? (
        <DailyCurveChart readings={readings} selectedDate={selectedDate} />
      ) : (
        <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          Add a cortisol reading to view the daily curve.
        </div>
      )}

      <WeeklyTrendChart readings={readings} />
      <ReadingsTable readings={readings} onDelete={onDeleteReading} />
    </div>
  )
}