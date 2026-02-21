"use client"

import { Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  type CortisolReading,
  TIME_SHORT_LABELS,
  HEALTHY_RANGES,
  getCortisolStatus,
} from "@/lib/cortisol-data"

interface ReadingsTableProps {
  readings: CortisolReading[]
  onDelete: (id: string) => void
}

export function ReadingsTable({ readings, onDelete }: ReadingsTableProps) {
  const sorted = [...readings].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date)
    if (dateCompare !== 0) return dateCompare
    const timeOrder = ["morning", "midday", "afternoon", "evening", "night"]
    return timeOrder.indexOf(a.timeOfDay) - timeOrder.indexOf(b.timeOfDay)
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reading History</CardTitle>
        <CardDescription>All logged cortisol readings</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[380px]">
          {sorted.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No readings logged yet. Add your first reading above.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sorted.map((reading) => {
                const status = getCortisolStatus(reading.value, reading.timeOfDay)
                const range = HEALTHY_RANGES[reading.timeOfDay]
                const displayDate = new Date(reading.date + "T12:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
                return (
                  <div
                    key={reading.id}
                    className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">{displayDate}</span>
                        <span className="text-sm font-medium">
                          {TIME_SHORT_LABELS[reading.timeOfDay]}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold tabular-nums">{reading.value}</span>
                        <span className="text-xs text-muted-foreground">mcg/dL</span>
                      </div>
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
                        {status === "normal" ? "In Range" : status === "high" ? "High" : "Low"}
                      </Badge>
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        (range: {range.min}-{range.max})
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(reading.id)}
                      className="size-8 p-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Delete reading from ${displayDate}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
