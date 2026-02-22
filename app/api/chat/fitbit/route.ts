import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

function summarizeSleepByDate(entries: any[]) {
  const map: Record<string, { date: string; minutesAsleep: number; efficiency: number; count: number }> = {}

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

export async function GET() {
  try {
    // ✅ This should point to the folder that CONTAINS all the Fitbit export subfolders
    const root = path.join(process.cwd(), "data", "Fitbit")

    // Debug: confirm what folder we are scanning
    if (!fs.existsSync(root)) {
      return NextResponse.json(
        { error: "Folder not found", root },
        { status: 500 }
      )
    }

    const allFiles = walk(root)

    // Pick sleep JSON files anywhere in the tree
    const sleepFiles = allFiles.filter((fp) => {
      const name = path.basename(fp).toLowerCase()
      return name.includes("sleep") && name.endsWith(".json")
    })

    let allSleep: any[] = []
    for (const fp of sleepFiles) {
      const content = fs.readFileSync(fp, "utf-8")
      const json = JSON.parse(content)
      if (Array.isArray(json)) allSleep.push(...json)
    }

    // Don’t dump EVERYTHING in the browser yet (could be massive).
    // Return a count + a small sample + the files found.
    const sleepDays = summarizeSleepByDate(allSleep)

  return NextResponse.json({
    sleepFileCount: sleepFiles.length,
    sleepEntryCount: allSleep.length,
    sleepDayCount: sleepDays.length,
    sleepDays: sleepDays.slice(-30)
  })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json(
      { error: "Failed to load Fitbit data", details: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}