import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

function summarizeSleepByDate(entries: any[]) {
  const map: Record<
    string,
    { date: string; minutesAsleep: number; efficiency: number; count: number }
  > = {}

  for (const e of entries) {
    const date = e?.dateOfSleep
    if (!date) continue

    if (!map[date]) {
      map[date] = { date, minutesAsleep: 0, efficiency: 0, count: 0 }
    }

    map[date].minutesAsleep += Number(e?.minutesAsleep ?? 0)
    map[date].efficiency += Number(e?.efficiency ?? 0)
    map[date].count += 1
  }

  const days = Object.values(map).map((d) => ({
    date: d.date,
    minutesAsleep: d.minutesAsleep,
    efficiency: d.count ? Math.round(d.efficiency / d.count) : 0,
  }))

  days.sort((a, b) => a.date.localeCompare(b.date))
  return days
}

// Recursively collect all files under a directory
function walk(dir: string, out: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

function safeReadJson(fp: string): any | null {
  try {
    const content = fs.readFileSync(fp, "utf-8")
    return JSON.parse(content)
  } catch {
    return null
  }
}

/**
 * Try to extract intraday points from Fitbit export-ish JSON structures.
 * Supports Fitbit export dateTime like "08/13/25 06:31:00" (MM/DD/YY HH:mm:ss)
 * Returns points as [{ time: "HH:mm", value: number }]
 */
function extractIntradayPoints(
  raw: any,
  selectedDate: string
): { time: string; value: number }[] {
  const points: { time: string; value: number }[] = []

  const pushPoint = (timeLike: string, valueLike: any) => {
    if (!timeLike) return
    const hhmm = timeLike.slice(0, 5) // "HH:mm" from "HH:mm:ss"
    const v = Number(valueLike)
    if (!Number.isFinite(v)) return
    points.push({ time: hhmm, value: v })
  }

  const toYmd = (dRaw: string) => {
    // already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dRaw)) return dRaw

    // MM/DD/YY
    if (dRaw.includes("/")) {
      const [mm, dd, yy] = dRaw.split("/")
      if (mm && dd && yy) {
        return `20${yy.padStart(2, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`
      }
    }

    return dRaw
  }

  // Case 1: array of entries with dateTime (your export samples match this)
  // e.g. { dateTime: "08/13/25 06:31:00", value: "0" }
  // HR: { dateTime: "08/13/25 06:31:19", value: { bpm: 138, confidence: 2 } }
  if (Array.isArray(raw)) {
    for (const e of raw) {
      const dt = e?.dateTime

      if (typeof dt === "string") {
        const normalized = dt.replace("T", " ")
        const [dRaw, t] = normalized.split(" ")
        if (!dRaw || !t) continue

        const d = toYmd(dRaw)
        if (d !== selectedDate) continue

        const val =
          typeof e?.value === "object" && e?.value !== null
            ? (e?.value?.bpm ?? e?.value?.heartRate ?? e?.value?.value)
            : e?.value

        pushPoint(t, val)
        continue
      }

      // Some exports might have separate date/time fields
      if (e?.date === selectedDate && typeof e?.time === "string") {
        const val =
          typeof e?.value === "object" && e?.value !== null
            ? (e?.value?.bpm ?? e?.value?.heartRate ?? e?.value?.value)
            : e?.value
        pushPoint(e.time, val)
      }
    }

    points.sort((a, b) => a.time.localeCompare(b.time))
    return points
  }

  // Case 2: object with "dataset" (common in intraday API responses)
  // dataset: [{ time: "08:31:00", value: 12 }, ...]
  const dataset =
    raw?.dataset ?? raw?.["activities-steps-intraday"]?.dataset ?? raw?.intraday?.dataset

  if (Array.isArray(dataset)) {
    for (const p of dataset) {
      if (typeof p?.time === "string") pushPoint(p.time, p?.value)
    }
  }

  points.sort((a, b) => a.time.localeCompare(b.time))
  return points
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") // "YYYY-MM-DD"
    const include = searchParams.get("include") // "intraday" | null

    const root = path.join(process.cwd(), "data", "Fitbit")

    if (!fs.existsSync(root)) {
      return NextResponse.json({ error: "Folder not found", root }, { status: 500 })
    }

    const allFiles = walk(root)

    // --- Sleep (existing) ---
    const sleepFiles = allFiles.filter((fp) => {
      const name = path.basename(fp).toLowerCase()
      return name.includes("sleep") && name.endsWith(".json")
    })

    let allSleep: any[] = []
    for (const fp of sleepFiles) {
      const json = safeReadJson(fp)
      if (Array.isArray(json)) allSleep.push(...json)
    }

    const sleepDays = summarizeSleepByDate(allSleep)

    // --- Intraday branch (Option B) ---
    if (include === "intraday" && date) {
      const stepsFiles = allFiles.filter((fp) => {
        const name = path.basename(fp).toLowerCase()
        return name.endsWith(".json") && name.includes("step") && !name.includes("sleep")
      })

      const hrFiles = allFiles.filter((fp) => {
        const name = path.basename(fp).toLowerCase()
        const looksLikeHr =
          name.includes("heartrate") ||
          name.includes("heart-rate") ||
          name.includes("heart_rate") ||
          name.includes("heart rate") ||
          // NOTE: "hr" is noisy, but you have 341 files already matching; keep for now
          name.includes("hr")
        return name.endsWith(".json") && looksLikeHr && !name.includes("sleep")
      })

      const stepsPoints: { time: string; value: number }[] = []
      const hrPoints: { time: string; value: number }[] = []

      let stepsDebugSample: any = null
      let hrDebugSample: any = null

      for (const fp of stepsFiles) {
        const json = safeReadJson(fp)
        if (!json) continue

        if (!stepsDebugSample) {
          stepsDebugSample = {
            file: path.basename(fp),
            type: Array.isArray(json) ? "array" : typeof json,
            keys: json && !Array.isArray(json) ? Object.keys(json).slice(0, 30) : null,
            sample: Array.isArray(json) ? json.slice(0, 3) : json,
          }
        }

        const extracted = extractIntradayPoints(json, date)
        if (extracted.length) stepsPoints.push(...extracted)
      }

      for (const fp of hrFiles) {
        const json = safeReadJson(fp)
        if (!json) continue

        if (!hrDebugSample) {
          hrDebugSample = {
            file: path.basename(fp),
            type: Array.isArray(json) ? "array" : typeof json,
            keys: json && !Array.isArray(json) ? Object.keys(json).slice(0, 30) : null,
            sample: Array.isArray(json) ? json.slice(0, 3) : json,
          }
        }

        const extracted = extractIntradayPoints(json, date)
        if (extracted.length) hrPoints.push(...extracted)
      }

      const dedupe = (arr: { time: string; value: number }[]) => {
        const m = new Map<string, number>()
        for (const p of arr) m.set(p.time, p.value)
        return Array.from(m.entries())
          .map(([time, value]) => ({ time, value }))
          .sort((a, b) => a.time.localeCompare(b.time))
      }

      const sleepSummary = sleepDays.find((d) => d.date === date) ?? null

      return NextResponse.json({
        date,
        heartRate: dedupe(hrPoints),
        steps: dedupe(stepsPoints),
        sleepSummary,
        debug: {
          stepsFiles: stepsFiles.length,
          hrFiles: hrFiles.length,
          stepsDebugSample,
          hrDebugSample,
        },
      })
    }

    // --- Existing response (sleep summary) ---
    return NextResponse.json({
      sleepFileCount: sleepFiles.length,
      sleepEntryCount: allSleep.length,
      sleepDayCount: sleepDays.length,
      sleepDays: sleepDays.slice(-30),
    })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json(
      { error: "Failed to load Fitbit data", details: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}