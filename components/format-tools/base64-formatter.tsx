"use client"

import { useState } from "react"
import { useFormatterStorage } from "@/hooks/use-formatter-storage"
import { Button } from "@/components/ui/button"
import { Copy, Check, Trash2, Wand2, AlertCircle } from "lucide-react"

export function Base64Formatter() {
  const { input, setInput: onInputChange, output, setOutput } = useFormatterStorage("base64")
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [mode, setMode] = useState<"encode" | "decode">("encode")

  const encodeBase64 = () => {
    if (!input.trim()) {
      setError("Por favor ingresa texto para codificar")
      setOutput("")
      return
    }

    try {
      const encoded = btoa(unescape(encodeURIComponent(input)))
      setOutput(encoded)
      setError(null)
    } catch (e) {
      setError(`Error al codificar: ${(e as Error).message}`)
      setOutput("")
    }
  }

  const decodeBase64 = () => {
    if (!input.trim()) {
      setError("Por favor ingresa Base64 para decodificar")
      setOutput("")
      return
    }

    try {
      const decoded = decodeURIComponent(escape(atob(input)))
      setOutput(decoded)
      setError(null)
    } catch (e) {
      setError("Base64 inválido")
      setOutput("")
    }
  }

  const copyToClipboard = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const clearAll = () => {
    onInputChange("")
    setOutput("")
    setError(null)
  }

  const swap = () => {
    onInputChange(output)
    setOutput(input)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Options Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Modo:</label>
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as "encode" | "decode")
              setOutput("")
              setError(null)
            }}
            className="bg-input border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="encode">Codificar</option>
            <option value="decode">Decodificar</option>
          </select>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button onClick={mode === "encode" ? encodeBase64 : decodeBase64} className="gap-2">
            <Wand2 className="h-4 w-4" />
            {mode === "encode" ? "Codificar" : "Decodificar"}
          </Button>
          <Button onClick={swap} variant="secondary" className="gap-2">
            Invertir
          </Button>
          <Button onClick={clearAll} variant="outline" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Limpiar
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Editor Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted-foreground">
            {mode === "encode" ? "Texto" : "Base64"}
          </label>
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={mode === "encode" ? "Ingresa texto aquí..." : "Ingresa Base64 aquí..."}
            className="min-h-[400px] w-full bg-input border border-border rounded-lg p-4 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-muted-foreground">
              {mode === "encode" ? "Base64" : "Texto"}
            </label>
            {output && (
              <Button
                onClick={copyToClipboard}
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-primary" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="min-h-[400px] w-full bg-card border border-border rounded-lg p-4 font-mono text-sm text-foreground overflow-auto break-all">
            {output ? (
              output
            ) : (
              <span className="text-muted-foreground/50">
                El resultado aparecerá aquí...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
