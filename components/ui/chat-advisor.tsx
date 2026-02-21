"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Send, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

const SUGGESTED_QUESTIONS = [
  "Why is my cortisol high in the morning?",
  "What foods help lower cortisol?",
  "How does exercise affect cortisol?",
  "Tips for better sleep to manage stress",
  "What is the cortisol awakening response?",
]

export function ChatAdvisor() {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })

  const isLoading = status === "streaming" || status === "submitted"

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, status])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput("")
  }

  const handleSuggestion = (question: string) => {
    if (isLoading) return
    sendMessage({ text: question })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="size-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Cora - Cortisol Advisor</h2>
          <p className="text-[10px] text-muted-foreground">
            {isLoading ? "Thinking..." : "Ask me anything about cortisol"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="flex flex-col gap-4 px-4 py-4">
          {messages.length === 0 && (
            <div className="flex flex-col gap-4 pt-6">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="size-7 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold">
                  Hi, I{"'"}m Cora!
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your personal cortisol advisor. Ask me about stress management, cortisol levels, or healthy habits.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Try asking:
                </p>
                {SUGGESTED_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    onClick={() => handleSuggestion(question)}
                    className="rounded-xl border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:bg-secondary/80"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => {
            const isUser = message.role === "user"
            return (
              <div
                key={message.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isUser
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-secondary-foreground rounded-bl-md"
                  }`}
                >
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return (
                        <span key={index} className="whitespace-pre-wrap">
                          {part.text}
                        </span>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            )
          })}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-secondary px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Thinking...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-card p-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
              placeholder="Ask about cortisol..."
              rows={1}
              disabled={isLoading}
              className="w-full resize-none rounded-xl border bg-background px-4 py-2.5 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              style={{ minHeight: "42px", maxHeight: "120px" }}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="size-[42px] shrink-0 rounded-xl"
            aria-label="Send message"
          >
            <Send className="size-4" />
          </Button>
        </form>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Not medical advice. Consult a healthcare provider for diagnosis.
        </p>
      </div>
    </div>
  )
}
