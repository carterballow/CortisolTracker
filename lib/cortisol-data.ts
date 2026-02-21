export interface CortisolReading {
  id: string
  value: number
  timeOfDay: "morning" | "midday" | "afternoon" | "evening" | "night"
  date: string
  notes: string
}

export const TIME_LABELS: Record<string, string> = {
  morning: "Morning (6-9 AM)",
  midday: "Midday (11 AM-1 PM)",
  afternoon: "Afternoon (2-5 PM)",
  evening: "Evening (6-9 PM)",
  night: "Night (10 PM-12 AM)",
}

export const TIME_SHORT_LABELS: Record<string, string> = {
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
}

// Healthy cortisol ranges (mcg/dL) by time of day
export const HEALTHY_RANGES: Record<string, { min: number; max: number }> = {
  morning: { min: 10, max: 20 },
  midday: { min: 6, max: 14 },
  afternoon: { min: 3, max: 10 },
  evening: { min: 2, max: 8 },
  night: { min: 1, max: 5 },
}

export function getCortisolStatus(value: number, timeOfDay: string): "low" | "normal" | "high" {
  const range = HEALTHY_RANGES[timeOfDay]
  if (!range) return "normal"
  if (value < range.min) return "low"
  if (value > range.max) return "high"
  return "normal"
}

export function generateSampleData(): CortisolReading[] {
  const readings: CortisolReading[] = []
  const times: CortisolReading["timeOfDay"][] = ["morning", "midday", "afternoon", "evening", "night"]
  const today = new Date()

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const date = new Date(today)
    date.setDate(today.getDate() - dayOffset)
    const dateStr = date.toISOString().split("T")[0]

    for (const time of times) {
      const range = HEALTHY_RANGES[time]
      const baseValue = (range.min + range.max) / 2
      const variation = (Math.random() - 0.5) * (range.max - range.min) * 1.3
      const value = Math.max(0.5, Math.round((baseValue + variation) * 10) / 10)

      readings.push({
        id: `${dateStr}-${time}`,
        value,
        timeOfDay: time,
        date: dateStr,
        notes: "",
      })
    }
  }

  return readings
}
