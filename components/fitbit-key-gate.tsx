"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY = "fitbit-api-key"

export default function FitbitKeyGate({ children }: { children: React.ReactNode }) {
    const [loaded, setLoaded] = useState(false)
    const [hasKey, setHasKey] = useState(false)
    const [input, setInput] = useState("")

    // Runs once when the app loads
    useEffect(() => {
        const existing = localStorage.getItem(STORAGE_KEY)

        if (existing && existing.trim().length > 0) {
            setHasKey(true)
        }

        setLoaded(true)
    }, [])

    function saveKey() {
        if (!input.trim()) return
        localStorage.setItem(STORAGE_KEY, input.trim())
        setHasKey(true)
    }

    // prevents hydration flicker
    if (!loaded) return null

    // SHOW THE PROMPT (user has no key yet)
    if (!hasKey) {
        return (
            <div style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "sans-serif"
            }}>
                <div style={{
                    border: "1px solid #ccc",
                    padding: "24px",
                    borderRadius: "12px",
                    width: "360px",
                    textAlign: "center"
                }}>
                    <h2>Connect Fitbit</h2>
                    <p style={{ fontSize: "14px", opacity: 0.7 }}>
                        Enter your Fitbit API key / token to use Cortisol Tracker
                    </p>

                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Paste Fitbit key here"
                        style={{
                            marginTop: "16px",
                            width: "100%",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid #ccc"
                        }}
                    />

                    <button
                        onClick={saveKey}
                        style={{
                            marginTop: "14px",
                            width: "100%",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "none",
                            background: "black",
                            color: "white",
                            cursor: "pointer"
                        }}
                    >
                        Continue
                    </button>

                    <p style={{ marginTop: "10px", fontSize: "11px", opacity: 0.6 }}>
                        Stored locally in your browser
                    </p>
                </div>
            </div>
        )
    }

    // USER HAS A KEY → allow the app to render
    return <>{children}</>
}