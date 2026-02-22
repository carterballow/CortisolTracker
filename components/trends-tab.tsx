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

type IntradayPoint = { time: string; value: number }
// ✅ Time fix: shift Fitbit intraday times by +12 hours (mod 24)
const TIME_SHIFT_MINUTES = 12 * 60

function shiftMinutes(m: number) {
  return (m + TIME_SHIFT_MINUTES) % 1440
}
function timeToMinutes(t: string) {
  const hh = parseInt(t.slice(0, 2), 10)
  const mm = parseInt(t.slice(3, 5), 10)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 0
  return hh * 60 + mm
}

function minutesToHHMM(m: number) {
  const hh = String(Math.floor(m / 60)).padStart(2, "0")
  const mm = String(m % 60).padStart(2, "0")
  return `${hh}:${mm}`
}

function median(nums: number[]) {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function estimateBaselineRestingHR(hrValues: number[]) {
  if (!hrValues.length) return 60
  const sorted = [...hrValues].sort((a, b) => a - b)
  const take = Math.max(5, Math.floor(sorted.length * 0.2)) // lowest 20%
  return median(sorted.slice(0, take))
}

function csvEscape(value: string | number | null | undefined) {
  const s = value === null || value === undefined ? "" : String(value)
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replaceAll('"', '""')}"`
  }
  return s
}

function build5MinCsv(args: {
  date: string
  heartRate: IntradayPoint[]
  steps: IntradayPoint[]
  sleepMinutesPrevNight: number | null
}) {
  const { date, heartRate, steps, sleepMinutesPrevNight } = args

  const hrVals = heartRate.map((p) => p.value).filter((v) => Number.isFinite(v))
  const baseline = estimateBaselineRestingHR(hrVals)

  // 5-min bins: 0..1435
  const bins = Array.from({ length: 288 }, (_, i) => i * 5).map((startMin) => ({
    startMin,
    hrSum: 0,
    hrCount: 0,
    stepsSum: 0,
  }))

  // Accumulate HR into bins
  for (const p of heartRate) {
    const min = shiftMinutes(timeToMinutes(p.time))
    const binStart = Math.floor(min / 5) * 5
    const idx = binStart / 5
    if (idx >= 0 && idx < bins.length) {
      bins[idx].hrSum += p.value
      bins[idx].hrCount += 1
    }
  }

  // Accumulate steps into bins
  for (const p of steps) {
    const min = shiftMinutes(timeToMinutes(p.time))
    const binStart = Math.floor(min / 5) * 5
    const idx = binStart / 5
    if (idx >= 0 && idx < bins.length) {
      bins[idx].stepsSum += p.value
    }
  }

  const header = [
    "date",
    "interval_start",
    "interval_end",
    "hr_intensity_pct_avg",
    "steps_5min_sum",
    "resting_hr_baseline_bpm",
    "sleep_minutes_prev_night",
  ]

  const rows = bins.map((b) => {
    const start = minutesToHHMM(shiftMinutes(b.startMin))
    const end = minutesToHHMM(shiftMinutes((b.startMin + 5) % 1440))
    const avgHr = b.hrCount ? b.hrSum / b.hrCount : null
    const intensityPct = avgHr !== null && baseline
      ? ((avgHr / baseline) - 1) * 100
      : null

    return [
      date,
      start,
      end,
      intensityPct === null ? "" : Math.round(intensityPct * 10) / 10, // 1 decimal
      b.stepsSum,
      baseline ? Math.round(baseline * 10) / 10 : "",
      sleepMinutesPrevNight ?? "",
    ]
  })

  const csv =
    header.join(",") +
    "\n" +
    rows.map((r) => r.map(csvEscape).join(",")).join("\n")

  return { csv, baseline }
}

function downloadTextFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
async function buildAllDaysCsv(args: {
  dates: string[]
  sleepDays: SleepDay[]
}) {
  const { dates, sleepDays } = args

  const sleepMap = new Map(sleepDays.map((d) => [d.date, d.minutesAsleep] as const))

  const header = [
    "date",
    "interval_start",
    "interval_end",
    "hr_intensity_pct_avg",
    "steps_5min_sum",
    "resting_hr_baseline_bpm",
    "sleep_minutes_prev_night",
  ].join(",")

  const allLines: string[] = [header]

  for (const date of dates) {
    try {
      const res = await fetch(
        `/api/chat/fitbit?date=${encodeURIComponent(date)}&include=intraday`,
        { cache: "no-store" }
      )
      if (!res.ok) continue

      const payload = (await res.json()) as {
        heartRate?: IntradayPoint[]
        steps?: IntradayPoint[]
      }

      const { csv } = build5MinCsv({
        date,
        heartRate: payload.heartRate ?? [],
        steps: payload.steps ?? [],
        sleepMinutesPrevNight: sleepMap.get(date) ?? null,
      })

      // Append only data rows (skip header)
      const lines = csv.split("\n")
      allLines.push(...lines.slice(1))
    } catch {
      // skip bad day
      continue
    }
  }

  return allLines.join("\n")
}
function parseLocalDate(ymd: string) {
  // Avoid timezone shifts
  return new Date(`${ymd}T12:00:00`)
}

function formatShort(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function toYMD(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function addDays(d: Date, days: number) {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy
}

type SleepDay = { date: string; minutesAsleep: number; efficiency: number }

// ✅ NEW: intraday types
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
    const fitbitDates = sleepDays.map((d) => d.date)
    return [...new Set([...cortisolDates, ...fitbitDates])].sort((a, b) => b.localeCompare(a))
  }, [readings, sleepDays])
  const visibleDates = useMemo(() => {
    if (!selectedDate) return []

    const sel = parseLocalDate(selectedDate)

    // Show 15 days INCLUDING the selected date:
    // selected ... selected-14 (newest → oldest)
    return Array.from({ length: 15 }, (_, i) => toYMD(addDays(sel, -i)))
  }, [selectedDate])
  useEffect(() => {
    if (availableDates.length === 0) return

    // Ensure selectedDate is always valid and defaults to most recent
    if (!selectedDate || !availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates[0]) // most recent because DESC
    }
  }, [availableDates, selectedDate])

  const navigateDate = (direction: "prev" | "next") => {
    const currentIndex = availableDates.indexOf(selectedDate)
    if (currentIndex === -1) return

    if (direction === "prev") {
      // older day
      const nextIndex = currentIndex + 1
      if (nextIndex < availableDates.length) setSelectedDate(availableDates[nextIndex])
    } else {
      // newer day
      const nextIndex = currentIndex - 1
      if (nextIndex >= 0) setSelectedDate(availableDates[nextIndex])
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
    if (!sleepDays.length || !selectedDate) return []

    const sel = parseLocalDate(selectedDate)
    const window = Array.from({ length: 7 }, (_, i) => toYMD(addDays(sel, -i)))
    const map = new Map(sleepDays.map((d) => [d.date, d] as const))

    return window
      .map((date) => map.get(date))
      .filter(Boolean) as SleepDay[]
  }, [sleepDays, selectedDate])

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
            disabled={!selectedDate || currentDateIndex >= availableDates.length - 1} // prev (older)

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
            disabled={!selectedDate || currentDateIndex <= 0} // next (newer)
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
            15 days
          </span>
        </div>

        {availableDates.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div className="mt-2 flex gap-2 overflow-x-auto whitespace-nowrap pb-2">
            {visibleDates.map((d) => {
              const active = d === selectedDate
              const hasData = availableDates.includes(d) // cortisol OR fitbit sleep exists

              return (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={[
                    "rounded-full border px-3 py-1 text-sm tabular-nums transition whitespace-nowrap",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted",
                    !hasData ? "opacity-50" : "",
                  ].join(" ")}
                  title={!hasData ? "No data for this day" : "Has data"}
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
        {intraday && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const { csv } = build5MinCsv({
                  date: selectedDate,
                  heartRate: intraday.heartRate,
                  steps: intraday.steps,
                  sleepMinutesPrevNight: selectedSleep?.minutesAsleep ?? null,
                })
                downloadTextFile(`cortisol_fitbit_${selectedDate}_5min.csv`, csv)
              }}
            >
              Export 5-min CSV
            </Button>

            <Button
              variant="outline"
              onClick={async () => {
                // Export for ALL known days (cortisol + sleep dates)
                // If you only want Fitbit days, use sleepDays.map(d => d.date)
                const csv = await buildAllDaysCsv({
                  dates: [...availableDates].slice().reverse(), // oldest -> newest (remove reverse if you want newest first)
                  sleepDays,
                })
                downloadTextFile(`cortisol_fitbit_ALL_DAYS_5min.csv`, csv)
              }}
            >
              Export ALL days CSV
            </Button>
          </div>
        )}
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