import { NextResponse } from "next/server"
import { spawn } from "child_process"

type IntradayPoint = { time: string; value: number }
type SleepDay = { date: string; minutesAsleep: number; efficiency: number }

type FitbitIntraday = {
  date: string
  heartRate: IntradayPoint[]
  steps: IntradayPoint[]
  sleepSummary?: SleepDay | null
}

const AVG_WAKE = 10 // assumed national avg wake mcg/dL
const NATIONAL_BAND_PCT = 0.2 // ±20% band for "normal range at this time"

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10)
}
function addDays(dateStr: string, delta: number) {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + delta)
  return isoDay(d)
}

function sumSteps(points: IntradayPoint[]) {
  return points.reduce((s, p) => s + (Number.isFinite(p.value) ? p.value : 0), 0)
}

// simple z-intensity using the day itself (fast + stable)
function computeHrIntensityZ(day: IntradayPoint[]) {
  const vals = day.map((p) => p.value).filter((x) => Number.isFinite(x))
  if (vals.length < 10) return 0
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  const variance = vals.reduce((a, b) => a + (b - mean) * (b - mean), 0) / vals.length
  const std = Math.sqrt(variance) || 1
  return vals.reduce((a, b) => a + (b - mean) / std, 0) / vals.length
}

// reference multiplier vs hours since wake
function refMultiplier(h: number) {
  const carPeakHour = 0.5
  const carWidth = 0.6
  const carBump = 0.35 * Math.exp(-Math.pow((h - carPeakHour) / carWidth, 2))
  const decay = Math.exp(-h / 8.0)
  const floor = 0.15

  const raw = floor + (1 - floor) * decay + carBump
  const atWake =
    floor + (1 - floor) * 1 + 0.35 * Math.exp(-Math.pow((0 - carPeakHour) / carWidth, 2))
  return raw / atWake
}

// cap at 1 so current never exceeds wake
function cappedMultiplier(h: number) {
  return Math.min(1, refMultiplier(h))
}

// fallback: assume wake at 7:00am local
function hoursSinceWakeFallback() {
  const now = new Date()
  const wake = new Date(now)
  wake.setHours(7, 0, 0, 0)
  return Math.max(0, (now.getTime() - wake.getTime()) / (1000 * 60 * 60))
}

async function fetchFitbit(date: string): Promise<FitbitIntraday> {
  const res = await fetch(
    `http://localhost:3000/api/chat/fitbit?date=${encodeURIComponent(date)}&include=intraday`,
    { cache: "no-store" }
  )
  if (!res.ok) throw new Error(`Fitbit fetch failed for ${date} (HTTP ${res.status})`)
  return res.json()
}

function runPython(rows: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const py = spawn("python3", ["scripts/predict_cortisol.py"], { stdio: ["pipe", "pipe", "pipe"] })

    let out = ""
    let err = ""

    py.stdout.on("data", (d) => (out += d.toString()))
    py.stderr.on("data", (d) => (err += d.toString()))

    py.on("close", (code) => {
      if (code !== 0) return reject(new Error(err || `python exited ${code}`))
      try {
        resolve(JSON.parse(out))
      } catch {
        reject(new Error("Failed to parse python output"))
      }
    })

    py.stdin.write(JSON.stringify({ rows }))
    py.stdin.end()
  })
}

function round2(x: number) {
  return Math.round(x * 100) / 100
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const days = Number(searchParams.get("days") ?? 1)
    const endDate = searchParams.get("date") ?? isoDay(new Date())

    // build date list
    const dateList: string[] = []
    for (let i = days - 1; i >= 0; i--) dateList.push(addDays(endDate, -i))

    // days=1 => only today + yesterday
    const neededDates =
      days === 1
        ? [dateList[0], addDays(dateList[0], -1)]
        : Array.from(new Set([...dateList, ...dateList.map((d) => addDays(d, -1))]))

    // parallel fetch
    const results = await Promise.all(neededDates.map(async (d) => [d, await fetchFitbit(d)] as const))
    const fitbitMap = new Map(results)

    // build feature rows
    const rows = dateList.map((d) => {
      const prev = addDays(d, -1)
      const prevData = fitbitMap.get(prev)
      const todayData = fitbitMap.get(d)

      return {
        date: d,
        avg_hr_intensity_prev_day: computeHrIntensityZ(prevData?.heartRate ?? []),
        steps_prev_day: sumSteps(prevData?.steps ?? []),
        sleep_minutes_prev_night: todayData?.sleepSummary?.minutesAsleep ?? 0,
        sleep_eff_prev_night: (todayData?.sleepSummary?.efficiency ?? 0) / 100,
      }
    })

    // run model
    const py = await runPython(rows)
    const preds = Array.isArray(py?.predictions) ? py.predictions : []

    // If days>1, return the raw list (for a future predictions tab)
    if (days > 1) {
      const avg =
        preds.length > 0
          ? round2(preds.reduce((a: number, p: any) => a + (p.predicted_wake_cortisol_ug_dL ?? 0), 0) / preds.length)
          : null

      return NextResponse.json({
        predictions: preds,
        average_predicted_wake_cortisol_ug_dL: avg,
      })
    }

    // days=1: compute dashboard metrics for HOME
    const p0 = preds[0]
    const wakeUgdl = Number(p0?.predicted_wake_cortisol_ug_dL)
    if (!Number.isFinite(wakeUgdl)) {
      return NextResponse.json({ error: "No wake prediction available." }, { status: 500 })
    }

    const hoursSinceWake = hoursSinceWakeFallback()

    // current (your curve scaled from wake)
    const currentUgdl = round2(wakeUgdl * cappedMultiplier(hoursSinceWake))

    // national average at this time
    const avgNationalNow = round2(AVG_WAKE * cappedMultiplier(hoursSinceWake))

    // percent vs national average NOW
    const percentVsAvgNow = round2(((currentUgdl - avgNationalNow) / avgNationalNow) * 100)

    // national "normal band" for this time (±20% of avg)
    const bandLow = avgNationalNow * (1 - NATIONAL_BAND_PCT)
    const bandHigh = avgNationalNow * (1 + NATIONAL_BAND_PCT)
    const inNationalRangeNow = currentUgdl >= bandLow && currentUgdl <= bandHigh

    // average today from wake -> now (sample each 15 min)
    const samples = Math.max(1, Math.floor(hoursSinceWake * 4)) // 4 samples per hour
    let sum = 0
    let peak = 0
    for (let i = 0; i <= samples; i++) {
      const h = (i / samples) * hoursSinceWake
      const v = wakeUgdl * cappedMultiplier(h)
      sum += v
      if (v > peak) peak = v
    }
    const averageUgdlToday = round2(sum / (samples + 1))
    const peakUgdlToday = round2(peak)

    return NextResponse.json({
      date: dateList[0],
      wakeUgdl: round2(wakeUgdl),
      currentUgdl,
      averageUgdlToday,
      peakUgdlToday,
      avgNationalNow,
      percentVsAvgNow,
      inNationalRangeNow,
      bandLow: round2(bandLow),
      bandHigh: round2(bandHigh),
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Prediction failed" },
      { status: 500 }
    )
  }
}