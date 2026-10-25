"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"

type TimerStatus = "stopped" | "running" | "alarming"

interface TimerSettings {
  minutes: number
  seconds: number
  sound: string
}

interface TimerContextType {
  settings: TimerSettings
  setSettings: (settings: TimerSettings) => void
  status: TimerStatus
  timeRemaining: number
  startTimer: () => void
  stopTimer: () => void
  resetTimer: () => void
}

const defaultSettings: TimerSettings = {
  minutes: 5,
  seconds: 0,
  sound: "beep",
}

const TimerContext = createContext<TimerContextType | null>(null)

export function useTimer() {
  const context = useContext(TimerContext)
  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider")
  }
  return context
}

// Sound generation using Web Audio API
function createSound(type: string): () => void {
  return () => {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    switch (type) {
      case "classic":
        oscillator.type = "square"
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.4)
        break
      case "beep":
        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime)
        break
      case "bell":
        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime)
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8)
        break
      case "siren":
        oscillator.type = "sawtooth"
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime)
        oscillator.frequency.linearRampToValueAtTime(800, audioContext.currentTime + 0.3)
        oscillator.frequency.linearRampToValueAtTime(400, audioContext.currentTime + 0.6)
        break
      case "buzz":
        oscillator.type = "square"
        oscillator.frequency.setValueAtTime(220, audioContext.currentTime)
        break
      default:
        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime)
    }
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.5)
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<TimerSettings>(defaultSettings)
  const [status, setStatus] = useState<TimerStatus>("stopped")
  const [timeRemaining, setTimeRemaining] = useState(0)
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const alarmSoundRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const alarmStopRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("timer-settings")
    if (saved) {
      try {
        setSettingsState(JSON.parse(saved))
      } catch {
        // use defaults
      }
    }
  }, [])

  const setSettings = useCallback((newSettings: TimerSettings) => {
    setSettingsState(newSettings)
    localStorage.setItem("timer-settings", JSON.stringify(newSettings))
  }, [])

  const getTotalSeconds = useCallback(() => {
    return settings.minutes * 60 + settings.seconds
  }, [settings])

  // Clear all timers and intervals
  const clearAll = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (alarmSoundRef.current) {
      clearInterval(alarmSoundRef.current)
      alarmSoundRef.current = null
    }
    if (alarmStopRef.current) {
      clearTimeout(alarmStopRef.current)
      alarmStopRef.current = null
    }
  }, [])

  // Start countdown from initial time
  const startCountdown = useCallback(() => {
    const total = getTotalSeconds()
    setTimeRemaining(total)
    setStatus("running")
    
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Timer reached 0, will trigger alarm via useEffect
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [getTotalSeconds])

  // Start alarm (called when timer reaches 0)
  const startAlarm = useCallback(() => {
    clearAll()
    setStatus("alarming")
    
    const playSound = createSound(settings.sound)
    playSound()
    alarmSoundRef.current = setInterval(playSound, 600)
    
    // Auto-stop after 20 seconds if no interaction
    alarmStopRef.current = setTimeout(() => {
      clearAll()
      setStatus("stopped")
      setTimeRemaining(0)
    }, 20000)
  }, [settings.sound, clearAll])

  // Watch for timer reaching 0
  useEffect(() => {
    if (status === "running" && timeRemaining === 0) {
      startAlarm()
    }
  }, [status, timeRemaining, startAlarm])

  // Stop everything
  const stopTimer = useCallback(() => {
    clearAll()
    setStatus("stopped")
    setTimeRemaining(0)
  }, [clearAll])

  // Start timer
  const startTimer = useCallback(() => {
    const total = getTotalSeconds()
    if (total <= 0) return
    clearAll()
    startCountdown()
  }, [getTotalSeconds, clearAll, startCountdown])

  // Reset timer (called on user interaction)
  const resetTimer = useCallback(() => {
    if (status === "stopped") return
    
    // If alarming: stop alarm and restart timer
    if (status === "alarming") {
      clearAll()
      startCountdown()
      return
    }
    
    // If running: just reset to initial time
    if (status === "running") {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      startCountdown()
    }
  }, [status, clearAll, startCountdown])

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAll()
  }, [clearAll])

  return (
    <TimerContext.Provider
      value={{
        settings,
        setSettings,
        status,
        timeRemaining,
        startTimer,
        stopTimer,
        resetTimer,
      }}
    >
      {children}
    </TimerContext.Provider>
  )
}
