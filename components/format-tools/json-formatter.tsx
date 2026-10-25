"use client"

import { useState } from "react"
import { useFormatterStorage } from "@/hooks/use-formatter-storage"
import { Button } from "@/components/ui/button"
import { Copy, Check, Trash2, Wand2, AlertCircle } from "lucide-react"

export function JsonFormatter() {
  const { input, setInput, output, setOutput, clear } = useFormatterStorage("json")
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [indentSize, setIndentSize] = useState(2)

  const formatJson = () => {
    if (!input.trim()) {
      setError("Por favor ingresa JSON para formatear")
      setOutput("")
      return
    }
    try {
      const parsed = JSON.parse(input)
      const formatted = JSON.stringify(parsed, null, indentSize)
      setOutput(formatted)
      setError(null)
    } catch (e) {
      setError(`JSON inválido: ${(e as Error).message}`)
      setOutput("")
    }
  }

  const minifyJson = () => {
    if (!input.trim()) {
      setError("Por favor ingresa JSON para minificar")
      setOutput("")
      return
    }
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed))
      setError(null)
    } catch (e) {
      setError(`JSON inválido: ${(e as Error).message}`)
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
    clear()
    setError(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Indentación:</label>
          <select
            value={indentSize}
            onChange={(e) => setIndentSize(Number(e.target.value))}
            className="bg-input border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value={2}>2 espacios</option>
            <option value={4}>4 espacios</option>
            <option value={1}>Tab</option>
          </select>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button onClick={formatJson} className="gap-2">
            <Wand2 className="h-4 w-4" />
            Formatear
          </Button>
          <Button onClick={minifyJson} variant="secondary">Minificar</Button>
          <Button onClick={clearAll} variant="outline" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Limpiar
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted-foreground">Entrada</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='{"ejemplo": "Pega tu JSON aquí..."}'
            className="min-h-[400px] w-full bg-input border border-border rounded-lg p-4 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-muted-foreground">Salida</label>
            {output && (
              <Button onClick={copyToClipboard} variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                {copied ? <><Check className="h-4 w-4 text-primary" />Copiado</> : <><Copy className="h-4 w-4" />Copiar</>}
              </Button>
            )}
          </div>
          <div className="min-h-[400px] w-full bg-card border border-border rounded-lg p-4 font-mono text-sm text-foreground overflow-auto">
            {output ? <pre className="whitespace-pre-wrap break-words">{output}</pre> : <span className="text-muted-foreground/50">El JSON formateado aparecerá aquí...</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
