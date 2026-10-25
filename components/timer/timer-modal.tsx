"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useTimer } from "@/contexts/timer-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Play, Square } from "lucide-react"

const sounds = [
  { id: "classic", name: "Alarma Clasica" },
  { id: "beep", name: "Beep Simple" },
  { id: "bell", name: "Campana" },
  { id: "siren", name: "Sirena" },
  { id: "buzz", name: "Zumbido" },
]

// Sound preview using Web Audio API
function playPreviewSound(type: string) {
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

interface TimerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TimerModal({ open, onOpenChange }: TimerModalProps) {
  const { settings, setSettings, status, timeRemaining, startTimer, stopTimer } = useTimer()
  const [minutes, setMinutes] = useState(settings.minutes.toString())
  const [seconds, setSeconds] = useState(settings.seconds.toString())
  const [sound, setSound] = useState(settings.sound)
  const startStopRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMinutes(settings.minutes.toString())
    setSeconds(settings.seconds.toString())
    setSound(settings.sound)
  }, [settings])

  // Focus the start/stop button when modal opens
  useEffect(() => {
    if (open) {
      const timeout = setTimeout(() => {
        startStopRef.current?.focus()
      }, 50)
      return () => clearTimeout(timeout)
    }
  }, [open])

  const handleSave = useCallback(() => {
    const mins = parseInt(minutes) || 0
    const secs = parseInt(seconds) || 0
    setSettings({ minutes: mins, seconds: secs, sound })
  }, [minutes, seconds, sound, setSettings])

  const handleStart = useCallback(() => {
    handleSave()
    startTimer()
    onOpenChange(false)
  }, [handleSave, startTimer, onOpenChange])

  const handleStop = useCallback(() => {
    stopTimer()
    onOpenChange(false)
  }, [stopTimer, onOpenChange])

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const displayTime = status === "stopped" 
    ? formatTime((parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0))
    : formatTime(timeRemaining)

  // Handle spacebar to start/stop
  useEffect(() => {
    if (!open) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        if (status === "running" || status === "alarming") {
          handleStop()
        } else {
          handleStart()
        }
      }
    }
    
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, status, handleStart, handleStop])

  const getStatusLabel = () => {
    switch (status) {
      case "running":
        return "En ejecucion"
      case "alarming":
        return "Alarma"
      default:
        return "Detenido"
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case "running":
        return "bg-primary"
      case "alarming":
        return "bg-destructive"
      default:
        return "bg-muted-foreground"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl font-bold">Temporizador Inteligente</DialogTitle>
          <DialogDescription>
            Se reinicia automaticamente con cualquier interaccion - Espacio para iniciar/detener
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minutes" className="font-medium">Minutos</Label>
              <Input
                id="minutes"
                type="number"
                min="0"
                max="99"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                disabled={status !== "stopped"}
                className="text-center"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seconds" className="font-medium">Segundos</Label>
              <Input
                id="seconds"
                type="number"
                min="0"
                max="59"
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
                disabled={status !== "stopped"}
                className="text-center"
              />
            </div>
          </div>

          {/* Sound selector */}
          <div className="space-y-2">
            <Label className="font-medium">Sonido de Alarma</Label>
            <div className="flex gap-2">
              <Select value={sound} onValueChange={setSound} disabled={status !== "stopped"}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sounds.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => playPreviewSound(sound)}
                type="button"
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Time display */}
          <div className="text-center">
            <div className="text-6xl font-bold tracking-wider font-mono text-foreground">
              {displayTime}
            </div>
          </div>

          {/* Start/Stop button */}
          <Button
            ref={startStopRef}
            className="w-full"
            size="lg"
            onClick={status === "stopped" ? handleStart : handleStop}
          >
            {status === "stopped" ? (
              <>
                <Play className="h-4 w-4 mr-2" />
                Iniciar (Espacio)
              </>
            ) : (
              <>
                <Square className="h-4 w-4 mr-2" />
                Detener (Espacio)
              </>
            )}
          </Button>

          {/* Status badge */}
          <div className="flex justify-center">
            <div className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-full">
              <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
              <span className="text-sm text-muted-foreground">{getStatusLabel()}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
