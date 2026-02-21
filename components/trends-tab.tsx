"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DailyCurveChart } from "@/components/daily-curve-chart"
import { WeeklyTrendChart } from "@/components/weekly-trend-chart"
import { ReadingsTable } from "@/components/readings-table"
import { type CortisolReading } from "@/lib/cortisol-data"

interface TrendsTabProps {
  readings: CortisolReading[]
  onDeleteReading: (id: string) => void
}

export function TrendsTab({ readings, onDeleteReading }: TrendsTabProps) {
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0]
  )

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

      <DailyCurveChart readings={readings} selectedDate={selectedDate} />
      <WeeklyTrendChart readings={readings} />
      <ReadingsTable readings={readings} onDelete={onDeleteReading} />
    </div>
  )
}
