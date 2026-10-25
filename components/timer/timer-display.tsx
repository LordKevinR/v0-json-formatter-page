"use client"

import { useEffect, useCallback, useState } from "react"
import { useTimer } from "@/contexts/timer-context"
import { Timer } from "lucide-react"

export function TimerDisplay() {
  const { status, timeRemaining, resetTimer, stopTimer } = useTimer()
  const [isExpanded, setIsExpanded] = useState(false)

  const handleActivity = useCallback(() => {
    resetTimer()
  }, [resetTimer])

  // Listen for Ctrl+Space to toggle visibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault()
        setIsExpanded((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Listen for any user activity to reset timer (both when running and alarming)
  useEffect(() => {
    if (status === "stopped") return

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"]
    
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [status, handleActivity])

  if (status === "stopped") return null

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const isAlarming = status === "alarming"

  return (
    <div 
      className={`inline-flex items-center gap-1 font-mono transition-all ${
        isExpanded
          ? "text-base text-muted-foreground"
          : isAlarming 
            ? "text-xs text-destructive/70 animate-pulse" 
            : "text-xs text-muted-foreground/40"
      }`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); stopTimer() }}
        title="Detener temporizador (Ctrl+Space para expandir)"
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        <Timer className={isExpanded ? "h-5 w-5" : "h-2.5 w-2.5"} />
      </button>
      <span>{formatTime(timeRemaining)}</span>
    </div>
  )
}
