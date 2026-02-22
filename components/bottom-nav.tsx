"use client"

import { Home, TrendingUp, CalendarDays, MessageCircle, User } from "lucide-react"

export type TabId = "home" | "trends" | "advisor" | "profile"

interface BottomNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "trends", label: "Trends", icon: TrendingUp },
  { id: "advisor", label: "Advisor", icon: MessageCircle },
  { id: "profile", label: "Profile", icon: User },
]

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md"
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className={`size-5 ${isActive ? "stroke-[2.5px]" : "stroke-[1.5px]"}`} />
              <span className={`text-[10px] leading-tight ${isActive ? "font-semibold" : "font-medium"}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute top-0 h-0.5 w-10 rounded-b-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
