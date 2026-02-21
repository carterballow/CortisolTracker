"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HEALTHY_RANGES, TIME_SHORT_LABELS } from "@/lib/cortisol-data"

export function HealthyRangesInfo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Healthy Cortisol Ranges</CardTitle>
        <CardDescription>
          Expected cortisol levels throughout the day (mcg/dL)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {Object.entries(HEALTHY_RANGES).map(([time, range]) => {
            const percentage = ((range.max - range.min) / 25) * 100
            const offset = (range.min / 25) * 100
            return (
              <div key={time} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{TIME_SHORT_LABELS[time]}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {range.min}-{range.max} mcg/dL
                  </span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="absolute h-full rounded-full bg-primary/30"
                    style={{ left: `${offset}%`, width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-6 rounded-lg bg-secondary/60 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Cortisol follows a natural diurnal rhythm, peaking in the morning shortly after waking (cortisol awakening response) and declining throughout the day. Persistently elevated or flattened cortisol curves may indicate chronic stress or adrenal dysfunction. Consult a healthcare provider for interpretation.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
