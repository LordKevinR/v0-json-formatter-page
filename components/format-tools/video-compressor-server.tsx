"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Upload,
  Download,
  Trash2,
  Video,
  Loader2,
  AlertCircle,
  Settings2,
  Zap,
  Scale,
  Sparkles,
  Server,
  Gauge,
} from "lucide-react"

type OutputFormat = "mp4" | "mp4-h265" | "webm"

interface Preset {
  id: string
  name: string
  description: string
  crf: number
  speed: string
  icon: React.ReactNode
}

const presets: Preset[] = [
  {
    id: "max",
    name: "Máxima compresión",
    description: "Menor peso posible",
    crf: 30,
    speed: "slow",
    icon: <Zap className="h-4 w-4" />,
  },
  {
    id: "balanced",
    name: "Balanceado",
    description: "Buen peso y calidad",
    crf: 26,
    speed: "medium",
    icon: <Scale className="h-4 w-4" />,
  },
  {
    id: "quality",
    name: "Alta calidad",
    description: "Prioriza la calidad",
    crf: 22,
    speed: "medium",
    icon: <Sparkles className="h-4 w-4" />,
  },
]

// x264/x265 presets ordered from fastest to smallest.
const speedPresets = ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower"]

const resolutions = [
  { value: 0, label: "Original" },
  { value: 1080, label: "1080p" },
  { value: 720, label: "720p" },
  { value: 480, label: "480p" },
  { value: 360, label: "360p" },
]

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

export function VideoCompressorServer() {
  const [file, setFile] = useState<File | null>(null)
  const [crf, setCrf] = useState(26)
  const [format, setFormat] = useState<OutputFormat>("mp4")
  const [speed, setSpeed] = useState("medium")
  const [scale, setScale] = useState(0)
  const [activePreset, setActivePreset] = useState<string>("balanced")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ url: string; size: number; name: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFileSelect = (selected: File | null) => {
    if (!selected) return
    if (!selected.type.startsWith("video/")) {
      setError("Por favor selecciona un archivo de video válido.")
      return
    }
    setFile(selected)
    setError(null)
    setResult(null)
    setProgress(0)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    handleFileSelect(e.dataTransfer.files?.[0] ?? null)
  }

  const applyPreset = (preset: Preset) => {
    setActivePreset(preset.id)
    setCrf(preset.crf)
    setSpeed(preset.speed)
  }

  const handleCompress = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    setProgress(0)
    setStatusText("Subiendo video al servidor...")

    try {
      const params = new URLSearchParams({
        crf: String(crf),
        format,
        preset: speed,
        scale: String(scale),
        name: file.name,
      })

      const res = await fetch(`/api/compress-video?${params.toString()}`, {
        method: "POST",
        body: file,
        headers: { "Content-Type": "application/octet-stream" },
        // @ts-expect-error - duplex is required by fetch when streaming a body
        duplex: "half",
      })

      if (!res.ok || !res.body) {
        throw new Error(`El servidor respondió ${res.status}`)
      }

      setStatusText("Comprimiendo en el servidor...")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let doneId: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split("\n\n")
        buffer = parts.pop() || ""
        for (const part of parts) {
          const trimmed = part.trim()
          if (!trimmed.startsWith("data:")) continue
          const payload = JSON.parse(trimmed.slice(5).trim())
          if (payload.type === "progress") {
            setProgress(payload.percent)
          } else if (payload.type === "done") {
            doneId = payload.id
            setProgress(100)
          } else if (payload.type === "error") {
            throw new Error(payload.message || "Error en el servidor")
          }
        }
      }

      if (!doneId) throw new Error("La compresión no se completó.")

      setStatusText("Descargando resultado...")
      const dl = await fetch(`/api/compress-video/download?id=${doneId}`)
      if (!dl.ok) throw new Error("No se pudo descargar el resultado.")
      const blob = await dl.blob()
      const url = URL.createObjectURL(blob)
      const baseName = file.name.replace(/\.[^/.]+$/, "")
      const ext = format === "webm" ? "webm" : "mp4"

      setResult({ url, size: blob.size, name: `${baseName}_comprimido.${ext}` })
      setStatusText("")
    } catch (err) {
      console.log("[v0] Server compression error:", err)
      setError(
        err instanceof Error
          ? `Ocurrió un error: ${err.message}`
          : "Ocurrió un error al comprimir el video.",
      )
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setProgress(0)
    setStatusText("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const reduction = result && file ? Math.round((1 - result.size / file.size) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Server className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Compresor de Video (Servidor)</h2>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full ml-1">
          ffmpeg nativo
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Procesa el video en el servidor con ffmpeg nativo: mucho más rápido y sin límite práctico de
        tamaño. El archivo se sube temporalmente y se elimina tras la descarga.
      </p>

      {/* Upload area */}
      {!file && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl py-16 px-6 cursor-pointer transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-secondary/30"
          }`}
        >
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-secondary">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              Arrastra un video aquí o haz clic para seleccionar
            </p>
            <p className="text-xs text-muted-foreground mt-1">MP4, WebM, MOV, AVI y más</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
          />
        </div>
      )}

      {/* File selected */}
      {file && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-secondary shrink-0">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClear} disabled={loading}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Nivel de compresión</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  disabled={loading}
                  className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
                    activePreset === preset.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-secondary/30"
                  }`}
                >
                  <div className="flex items-center gap-2 text-foreground">
                    {preset.icon}
                    <span className="text-sm font-medium">{preset.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{preset.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced toggle */}
          <div>
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings2 className="h-4 w-4" />
              Ajustes avanzados
            </button>
          </div>

          {/* Advanced settings */}
          {showAdvanced && (
            <div className="space-y-4 rounded-lg border border-border bg-card p-4">
              {/* CRF slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Calidad (CRF): {crf}</label>
                  <span className="text-xs text-muted-foreground">
                    {crf <= 23 ? "Alta calidad" : crf <= 30 ? "Media" : "Mayor compresión"}
                  </span>
                </div>
                <input
                  type="range"
                  min={18}
                  max={40}
                  value={crf}
                  onChange={(e) => {
                    setCrf(Number(e.target.value))
                    setActivePreset("")
                  }}
                  disabled={loading}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Mejor calidad</span>
                  <span>Menor peso</span>
                </div>
              </div>

              {/* Format */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Formato de salida</label>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: "mp4", label: "MP4 (H.264)" },
                      { id: "mp4-h265", label: "MP4 (H.265)" },
                      { id: "webm", label: "WebM (VP9)" },
                    ] as { id: OutputFormat; label: string }[]
                  ).map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => setFormat(fmt.id)}
                      disabled={loading}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        format === fmt.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  H.265 y VP9 comprimen más, pero tardan más. H.264 es el más compatible.
                </p>
              </div>

              {/* Resolution */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Resolución</label>
                <div className="flex flex-wrap gap-2">
                  {resolutions.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setScale(r.value)}
                      disabled={loading}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        scale === r.value
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed preset */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Gauge className="h-4 w-4" /> Velocidad de codificación
                  </label>
                  <span className="text-xs text-muted-foreground">{speed}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={speedPresets.length - 1}
                  value={speedPresets.indexOf(speed)}
                  onChange={(e) => {
                    setSpeed(speedPresets[Number(e.target.value)])
                    setActivePreset("")
                  }}
                  disabled={loading || format === "webm"}
                  className="w-full accent-primary disabled:opacity-40"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Más rápido</span>
                  <span>Menor peso</span>
                </div>
                {format === "webm" && (
                  <p className="text-xs text-muted-foreground">
                    El preset de velocidad no aplica a WebM (VP9).
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Compress button */}
          <Button className="w-full" size="lg" onClick={handleCompress} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {statusText || `Comprimiendo... ${progress}%`}
              </>
            ) : (
              <>
                <Server className="h-4 w-4" />
                Comprimir en el servidor
              </>
            )}
          </Button>

          {/* Progress bar */}
          {loading && (
            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {statusText && progress > 0 && (
                <p className="text-xs text-muted-foreground text-right">{progress}%</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Result */}
      {result && file && (
        <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">¡Compresión completada!</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Original</p>
              <p className="text-sm font-medium text-foreground">{formatBytes(file.size)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Comprimido</p>
              <p className="text-sm font-medium text-foreground">{formatBytes(result.size)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reducción</p>
              <p
                className={`text-sm font-semibold ${
                  reduction > 0 ? "text-primary" : "text-destructive"
                }`}
              >
                {reduction > 0 ? `-${reduction}%` : `+${Math.abs(reduction)}%`}
              </p>
            </div>
          </div>
          <video
            src={result.url}
            controls
            className="w-full rounded-lg border border-border max-h-64 bg-black"
          />
          <a href={result.url} download={result.name}>
            <Button className="w-full" variant="default">
              <Download className="h-4 w-4" />
              Descargar video comprimido
            </Button>
          </a>
        </div>
      )}
    </div>
  )
}
