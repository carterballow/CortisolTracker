"use client"

import { Activity, TrendingDown, TrendingUp, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type CortisolReading, getCortisolStatus, HEALTHY_RANGES } from "@/lib/cortisol-data"

interface StatsOverviewProps {
  readings: CortisolReading[]
}

export function StatsOverview({ readings }: StatsOverviewProps) {
  const todayStr = new Date().toISOString().split("T")[0]
  const todayReadings = readings.filter((r) => r.date === todayStr)
  const latestReading = todayReadings.length > 0 ? todayReadings[todayReadings.length - 1] : null

  const avgToday =
    todayReadings.length > 0
      ? Math.round((todayReadings.reduce((s, r) => s + r.value, 0) / todayReadings.length) * 10) / 10
      : null

  const normalCount = todayReadings.filter(
    (r) => getCortisolStatus(r.value, r.timeOfDay) === "normal"
  ).length

  const peakReading = todayReadings.length > 0 ? todayReadings.reduce((max, r) => (r.value > max.value ? r : max), todayReadings[0]) : null

  const stats = [
    {
      title: "Latest Reading",
      value: latestReading ? `${latestReading.value}` : "--",
      unit: "mcg/dL",
      description: latestReading
        ? `${getCortisolStatus(latestReading.value, latestReading.timeOfDay) === "normal" ? "Within" : "Outside"} healthy range`
        : "No readings today",
      icon: Activity,
      color:
        latestReading && getCortisolStatus(latestReading.value, latestReading.timeOfDay) === "normal"
          ? "text-accent"
          : latestReading
            ? "text-destructive"
            : "text-muted-foreground",
    },
    {
      title: "Today's Average",
      value: avgToday !== null ? `${avgToday}` : "--",
      unit: "mcg/dL",
      description: todayReadings.length > 0 ? `From ${todayReadings.length} reading${todayReadings.length > 1 ? "s" : ""}` : "No data yet",
      icon: TrendingDown,
      color: "text-primary",
    },
    {
      title: "In Range",
      value: todayReadings.length > 0 ? `${normalCount}/${todayReadings.length}` : "--",
      unit: "",
      description: todayReadings.length > 0 ? `${Math.round((normalCount / todayReadings.length) * 100)}% of readings` : "No data yet",
      icon: TrendingUp,
      color: "text-accent",
    },
    {
      title: "Peak Level",
      value: peakReading ? `${peakReading.value}` : "--",
      unit: peakReading ? "mcg/dL" : "",
      description: peakReading
        ? `${peakReading.timeOfDay.charAt(0).toUpperCase() + peakReading.timeOfDay.slice(1)} (range: ${HEALTHY_RANGES[peakReading.timeOfDay].min}-${HEALTHY_RANGES[peakReading.timeOfDay].max})`
        : "No readings today",
      icon: Clock,
      color: "text-primary",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            <stat.icon className={`size-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight">{stat.value}</span>
              {stat.unit && <span className="text-sm text-muted-foreground">{stat.unit}</span>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
