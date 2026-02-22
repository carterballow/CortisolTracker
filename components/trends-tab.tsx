"use client"

import { useMemo, useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DailyCurveChart } from "@/components/daily-curve-chart"
import { WeeklyTrendChart } from "@/components/weekly-trend-chart"
import { ReadingsTable } from "@/components/readings-table"
import { type CortisolReading } from "@/lib/cortisol-data"

type SleepDay = { date: string; minutesAsleep: number; efficiency: number }


interface TrendsTabProps {
  readings: CortisolReading[]
  onDeleteReading: (id: string) => void
}

export function TrendsTab({ readings, onDeleteReading }: TrendsTabProps) {
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0]
  )

  const [sleepDays, setSleepDays] = useState<SleepDay[]>([])
  const [sleepLoading, setSleepLoading] = useState(true)
  const [sleepError, setSleepError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

      ;(async () => {
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

  const availableDates = useMemo(() => {
    return [...new Set(readings.map((r) => r.date))].sort()
  }, [readings])

  const navigateDate = (direction: "prev" | "next") => {
    const currentIndex = availableDates.indexOf(selectedDate)

    if (direction === "prev" && currentIndex > 0) {
      setSelectedDate(availableDates[currentIndex - 1])
    } else if (direction === "next" && currentIndex < availableDates.length - 1) {
      setSelectedDate(availableDates[currentIndex + 1])
    }
  }

  const currentDateIndex = availableDates.indexOf(selectedDate)
  const last7Sleep = useMemo(() => {
    const sorted = [...sleepDays].sort((a, b) => a.date.localeCompare(b.date))
    return sorted.slice(-7).reverse()
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
            disabled={currentDateIndex <= 0}
            aria-label="Previous day"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[80px] text-center text-sm font-medium tabular-nums">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => navigateDate("next")}
            disabled={currentDateIndex >= availableDates.length - 1}
            aria-label="Next day"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-semibold">Fitbit Sleep (last 7 days)</h3>

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
      <DailyCurveChart readings={readings} selectedDate={selectedDate} />
      <WeeklyTrendChart readings={readings} />
      <ReadingsTable readings={readings} onDelete={onDeleteReading} />
    </div>
  )
}
