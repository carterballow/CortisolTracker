"use client"

import { useState, useEffect } from "react"
import { Activity } from "lucide-react"
import { BottomNav, type TabId } from "@/components/bottom-nav"
import { HomeTab } from "@/components/home-tab"
import { TrendsTab } from "@/components/trends-tab"
import { ChatAdvisor } from "@/components/chat-advisor"
import { ProfileTab } from "@/components/profile-tab"
import { type CortisolReading } from "@/lib/cortisol-data"

export default function CortisolTracker() {
  const [activeTab, setActiveTab] = useState<TabId>("home")
  const [readings, setReadings] = useState<CortisolReading[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const saved = localStorage.getItem("cortisol-readings")
      return saved ? (JSON.parse(saved) as CortisolReading[]) : []
    } catch (error) {
      console.error("Failed to parse cortisol readings from localStorage:", error)
      return []
    }
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("cortisol-readings", JSON.stringify(readings))
  }, [readings])

  const handleAddReading = (reading: CortisolReading) => {
    setReadings((prev) => [...prev, reading])
  }

  const handleDeleteReading = (id: string) => {
    setReadings((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center gap-2.5 border-b bg-card/90 px-4 py-3 backdrop-blur-md">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
          <Activity className="size-4 text-primary-foreground" />
        </div>
        <h1 className="text-base font-bold tracking-tight">Cortisol Tracker</h1>
      </header>

      {/* Tab content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === "home" && (
          <div className="px-4 py-5">
            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-lg font-semibold">Home</h2>
              <p className="mt-1 text-sm text-muted-foreground">Coming soon.</p>
            </div>
          </div>
        )}
        {activeTab === "trends" && (
          <TrendsTab readings={readings} onDeleteReading={handleDeleteReading} />
        )}
        {activeTab === "advisor" && (
          <div className="flex h-[calc(100svh-57px-64px)] flex-col">
            <ChatAdvisor />
          </div>
        )}
        {activeTab === "profile" && <ProfileTab readings={readings} />}
      </main>

      {/* Bottom navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}



