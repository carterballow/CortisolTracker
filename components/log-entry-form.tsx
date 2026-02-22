"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { type CortisolReading, TIME_LABELS, HEALTHY_RANGES } from "@/lib/cortisol-data"

interface LogEntryFormProps {
  onSubmit: (reading: CortisolReading) => void
}

export function LogEntryForm({ onSubmit }: LogEntryFormProps) {
  const [value, setValue] = useState("")
  const [timeOfDay, setTimeOfDay] = useState<CortisolReading["timeOfDay"]>("morning")
  const [notes, setNotes] = useState("")

  // ✅ NEW: allow choosing the date (defaults to today)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const numValue = Number.parseFloat(value)
    if (!Number.isFinite(numValue) || numValue <= 0) return
    if (!date) return

    const reading: CortisolReading = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      value: numValue,
      timeOfDay,
      date, // ✅ USE SELECTED DATE, not always "today"
      notes,
    }

    onSubmit(reading)
    setValue("")
    setNotes("")
    // keep date as-is (so user can log multiple entries for same day)
  }

  const range = HEALTHY_RANGES[timeOfDay]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="size-5 text-primary" />
          Log Cortisol Reading
        </CardTitle>
        <CardDescription>Enter your cortisol level from a saliva or blood test</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* ✅ NEW: Date picker */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="cortisol-date">Date</Label>
              <Input
                id="cortisol-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cortisol-value">Cortisol Level (mcg/dL)</Label>
              <Input
                id="cortisol-value"
                type="number"
                step="0.1"
                min="0"
                max="50"
                placeholder="e.g. 12.5"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Healthy range: {range.min}-{range.max} mcg/dL
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="time-of-day">Time of Day</Label>
              <Select
                value={timeOfDay}
                onValueChange={(v) => setTimeOfDay(v as CortisolReading["timeOfDay"])}
              >
                <SelectTrigger id="time-of-day" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIME_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="How are you feeling? Any notable stressors today?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full sm:w-auto sm:self-end">
            Log Reading
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}