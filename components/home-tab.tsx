"use client"

import { StatsOverview } from "@/components/stats-overview"
import { LogEntryForm } from "@/components/log-entry-form"
import { HealthyRangesInfo } from "@/components/healthy-ranges-info"
import { type CortisolReading } from "@/lib/cortisol-data"

interface HomeTabProps {
  readings: CortisolReading[]
  onAddReading: (reading: CortisolReading) => void
}

export function HomeTab({ readings, onAddReading }: HomeTabProps) {
  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-balance">
          Good {getGreeting()}
        </h2>
        <p className="text-sm text-muted-foreground">
          Track your cortisol levels and stay on top of your health.
        </p>
      </div>

      <StatsOverview readings={readings} />
      <LogEntryForm onSubmit={onAddReading} />
      <HealthyRangesInfo />
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "morning"
  if (hour < 17) return "afternoon"
  return "evening"
}
