"use client"

import { useState, useRef, useCallback } from "react"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"
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
} from "lucide-react"

type OutputFormat = "mp4" | "webm"

interface Preset {
  id: string
  name: string
  description: string
  crf: number
  icon: React.ReactNode
}

const presets: Preset[] = [
  {
    id: "max",
    name: "Máxima compresión",
    description: "Menor peso posible",
    crf: 32,
    icon: <Zap className="h-4 w-4" />,
  },
  {
    id: "balanced",
    name: "Balanceado",
    description: "Buen peso y calidad",
    crf: 28,
    icon: <Scale className="h-4 w-4" />,
  },
  {
    id: "quality",
    name: "Alta calidad",
    description: "Prioriza la calidad",
    crf: 23,
    icon: <Sparkles className="h-4 w-4" />,
  },
]

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

export function VideoCompressor() {
  const [file, setFile] = useState<File | null>(null)
  const [crf, setCrf] = useState(28)
  const [format, setFormat] = useState<OutputFormat>("mp4")
  const [activePreset, setActivePreset] = useState<string>("balanced")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingFFmpeg, setLoadingFFmpeg] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ url: string; size: number; name: string } | null>(null)

  const ffmpegRef = useRef<FFmpeg | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current

    setLoadingFFmpeg(true)
    const ffmpeg = new FFmpeg()
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd"

    ffmpeg.on("progress", ({ progress }) => {
      setProgress(Math.min(100, Math.round(progress * 100)))
    })

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    })

    ffmpegRef.current = ffmpeg
    setLoadingFFmpeg(false)
    return ffmpeg
  }, [])

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
  }

  const handleCompress = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    setProgress(0)

    try {
      const ffmpeg = await loadFFmpeg()
      const inputName = "input_" + file.name.replace(/[^a-zA-Z0-9.]/g, "_")
      const outputName = `output.${format}`

      await ffmpeg.writeFile(inputName, await fetchFile(file))

      const args = ["-i", inputName]
      if (format === "mp4") {
        args.push(
          "-c:v", "libx264",
          "-crf", crf.toString(),
          "-preset", "medium",
          "-c:a", "aac",
          "-b:a", "128k",
        )
      } else {
        args.push(
          "-c:v", "libvpx-vp9",
          "-crf", crf.toString(),
          "-b:v", "0",
          "-c:a", "libopus",
        )
      }
      args.push(outputName)

      await ffmpeg.exec(args)

      const data = await ffmpeg.readFile(outputName)
      const blob = new Blob([data as Uint8Array], {
        type: format === "mp4" ? "video/mp4" : "video/webm",
      })
      const url = URL.createObjectURL(blob)
      const baseName = file.name.replace(/\.[^/.]+$/, "")

      setResult({
        url,
        size: blob.size,
        name: `${baseName}_comprimido.${format}`,
      })
      setProgress(100)

      await ffmpeg.deleteFile(inputName)
      await ffmpeg.deleteFile(outputName)
    } catch (err) {
      console.log("[v0] Video compression error:", err)
      setError("Ocurrió un error al comprimir el video. Intenta con otro archivo o formato.")
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const reduction =
    result && file ? Math.round((1 - result.size / file.size) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Video className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Compresor de Video</h2>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full ml-1">
          100% local
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Comprime videos directamente en tu navegador. Nada se sube a ningún servidor.
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
            <p className="text-xs text-muted-foreground mt-1">
              MP4, WebM, MOV, AVI y más
            </p>
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
                  <label className="text-sm font-medium text-foreground">
                    Calidad (CRF): {crf}
                  </label>
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
                <div className="flex gap-2">
                  {(["mp4", "webm"] as OutputFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setFormat(fmt)}
                      disabled={loading}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        format === fmt
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Compress button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleCompress}
            disabled={loading || loadingFFmpeg}
          >
            {loadingFFmpeg ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando motor de compresión...
              </>
            ) : loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Comprimiendo... {progress}%
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Comprimir video
              </>
            )}
          </Button>

          {/* Progress bar */}
          {loading && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
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
