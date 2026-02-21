"use client"

import { useMemo, useState } from "react"
import { DayPicker } from "react-day-picker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  type CortisolReading,
  TIME_SHORT_LABELS,
  HEALTHY_RANGES,
  getCortisolStatus,
} from "@/lib/cortisol-data"

interface CalendarTabProps {
  readings: CortisolReading[]
}

export function CalendarTab({ readings }: CalendarTabProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const selectedDateStr = selectedDate.toISOString().split("T")[0]

  const datesWithReadings = useMemo(() => {
    const dates = new Set(readings.map((r) => r.date))
    return Array.from(dates).map((d) => new Date(d + "T12:00:00"))
  }, [readings])

  const dayReadings = useMemo(() => {
    return readings
      .filter((r) => r.date === selectedDateStr)
      .sort((a, b) => {
        const order = ["morning", "midday", "afternoon", "evening", "night"]
        return order.indexOf(a.timeOfDay) - order.indexOf(b.timeOfDay)
      })
  }, [readings, selectedDateStr])

  const daySummary = useMemo(() => {
    if (dayReadings.length === 0) return null
    const avg =
      Math.round(
        (dayReadings.reduce((s, r) => s + r.value, 0) / dayReadings.length) * 10
      ) / 10
    const inRange = dayReadings.filter(
      (r) => getCortisolStatus(r.value, r.timeOfDay) === "normal"
    ).length
    return { avg, inRange, total: dayReadings.length }
  }, [dayReadings])

  const displayDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Calendar</h2>
        <p className="text-sm text-muted-foreground">View your daily cortisol history</p>
      </div>

      <Card>
        <CardContent className="flex items-center justify-center pt-4 pb-2">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            modifiers={{ hasData: datesWithReadings }}
            modifiersClassNames={{
              hasData: "has-data-dot",
            }}
            className="mx-auto"
            classNames={{
              today: "bg-primary/10 text-primary font-bold rounded-md",
              selected: "bg-primary text-primary-foreground rounded-md",
              root: "text-sm",
              day: "size-9 rounded-md text-center font-normal aria-selected:opacity-100 hover:bg-secondary transition-colors relative",
              month_caption: "text-sm font-semibold text-foreground",
              button_previous: "text-muted-foreground hover:text-foreground size-8 flex items-center justify-center",
              button_next: "text-muted-foreground hover:text-foreground size-8 flex items-center justify-center",
              weekday: "text-xs font-medium text-muted-foreground w-9 text-center",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{displayDate}</CardTitle>
        </CardHeader>
        <CardContent>
          {daySummary ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center rounded-lg bg-secondary/60 px-4 py-2">
                  <span className="text-2xl font-bold tabular-nums">{daySummary.avg}</span>
                  <span className="text-[10px] text-muted-foreground">Avg mcg/dL</span>
                </div>
                <div className="flex flex-col items-center rounded-lg bg-secondary/60 px-4 py-2">
                  <span className="text-2xl font-bold tabular-nums">
                    {daySummary.inRange}/{daySummary.total}
                  </span>
                  <span className="text-[10px] text-muted-foreground">In Range</span>
                </div>
                <div className="flex flex-col items-center rounded-lg bg-secondary/60 px-4 py-2">
                  <span className="text-2xl font-bold tabular-nums">{daySummary.total}</span>
                  <span className="text-[10px] text-muted-foreground">Readings</span>
                </div>
              </div>

              <ScrollArea className="max-h-[240px]">
                <div className="flex flex-col gap-2">
                  {dayReadings.map((reading) => {
                    const status = getCortisolStatus(reading.value, reading.timeOfDay)
                    const range = HEALTHY_RANGES[reading.timeOfDay]
                    return (
                      <div
                        key={reading.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {TIME_SHORT_LABELS[reading.timeOfDay]}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {range.min}-{range.max} mcg/dL
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold tabular-nums">
                            {reading.value}
                          </span>
                          <Badge
                            variant={status === "normal" ? "secondary" : "destructive"}
                            className={
                              status === "normal"
                                ? "bg-accent/15 text-accent border-accent/20"
                                : status === "high"
                                  ? "bg-destructive/10 text-destructive border-destructive/20"
                                  : "bg-chart-4/15 text-chart-4 border-chart-4/20"
                            }
                          >
                            {status === "normal"
                              ? "OK"
                              : status === "high"
                                ? "High"
                                : "Low"}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex h-[120px] items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No readings logged for this day.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
