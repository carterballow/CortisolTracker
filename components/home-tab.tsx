"use client"

import { StatsOverview } from "@/components/stats-overview"
import { HealthyRangesInfo } from "@/components/healthy-ranges-info"
import { type CortisolReading } from "@/lib/cortisol-data"

interface HomeTabProps {
  readings: CortisolReading[] // unused for now, but keep to avoid refactor
  onAddReading: (reading: CortisolReading) => void // unused for now, but keep
}

export function HomeTab({ readings, onAddReading }: HomeTabProps) {
  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-balance">
          Good {getGreeting()}
        </h2>
        <p className="text-sm text-muted-foreground">
          Fitbit-based cortisol estimates and daily comparisons.
        </p>
      </div>

      <StatsOverview />
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