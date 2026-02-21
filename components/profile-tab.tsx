"use client"

import { useMemo } from "react"
import { Activity, Calendar, Target, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  type CortisolReading,
  getCortisolStatus,
} from "@/lib/cortisol-data"

interface ProfileTabProps {
  readings: CortisolReading[]
}

export function ProfileTab({ readings }: ProfileTabProps) {
  const stats = useMemo(() => {
    if (readings.length === 0)
      return { totalReadings: 0, daysTracked: 0, overallAvg: 0, inRangePercent: 0, streak: 0 }

    const uniqueDays = new Set(readings.map((r) => r.date))
    const overallAvg =
      Math.round((readings.reduce((s, r) => s + r.value, 0) / readings.length) * 10) / 10
    const inRange = readings.filter(
      (r) => getCortisolStatus(r.value, r.timeOfDay) === "normal"
    ).length
    const inRangePercent = Math.round((inRange / readings.length) * 100)

    // Calculate streak
    const sortedDates = [...uniqueDays].sort().reverse()
    let streak = 0
    const today = new Date()
    for (let i = 0; i < sortedDates.length; i++) {
      const expected = new Date(today)
      expected.setDate(today.getDate() - i)
      const expectedStr = expected.toISOString().split("T")[0]
      if (sortedDates[i] === expectedStr) {
        streak++
      } else {
        break
      }
    }

    return {
      totalReadings: readings.length,
      daysTracked: uniqueDays.size,
      overallAvg,
      inRangePercent,
      streak,
    }
  }, [readings])

  const profileStats = [
    {
      label: "Total Readings",
      value: stats.totalReadings.toString(),
      icon: Activity,
    },
    {
      label: "Days Tracked",
      value: stats.daysTracked.toString(),
      icon: Calendar,
    },
    {
      label: "In Range",
      value: `${stats.inRangePercent}%`,
      icon: Target,
    },
    {
      label: "Avg Level",
      value: `${stats.overallAvg}`,
      icon: TrendingDown,
    },
  ]

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Profile</h2>
        <p className="text-sm text-muted-foreground">Your cortisol tracking summary</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 pt-6 pb-5">
          <Avatar className="size-16">
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
              U
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h3 className="text-base font-semibold">Cortisol Tracker User</h3>
            <p className="text-xs text-muted-foreground">
              Tracking since {stats.daysTracked > 0 ? `${stats.daysTracked} day${stats.daysTracked > 1 ? "s" : ""}` : "today"}
            </p>
          </div>
          {stats.streak > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
              <span className="text-xs font-semibold text-primary">
                {stats.streak} day streak
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {profileStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex flex-col items-center gap-2 py-4">
              <stat.icon className="size-5 text-primary" />
              <span className="text-xl font-bold tabular-nums">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground">{stat.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">About This App</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>
              Track your cortisol levels throughout the day to understand your stress patterns and optimize your health.
            </p>
            <Separator />
            <p className="text-xs leading-relaxed">
              Cortisol follows a natural diurnal rhythm, peaking in the morning and declining through the evening. Monitoring this pattern can help identify chronic stress, sleep issues, or adrenal dysfunction.
            </p>
            <Separator />
            <p className="text-[10px]">
              This tool is for informational purposes only. Consult your healthcare provider for interpretation of cortisol levels.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
