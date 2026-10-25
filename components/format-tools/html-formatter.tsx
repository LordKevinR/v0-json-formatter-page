"use client"

import { useState } from "react"
import { useFormatterStorage } from "@/hooks/use-formatter-storage"
import { Button } from "@/components/ui/button"
import { Copy, Check, Trash2, Wand2, AlertCircle } from "lucide-react"

export function HtmlFormatter() {
  const { input, setInput: onInputChange, output, setOutput } = useFormatterStorage("html")
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [indentSize, setIndentSize] = useState(2)

  const formatHtml = () => {
    if (!input.trim()) {
      setError("Por favor ingresa HTML para formatear")
      setOutput("")
      return
    }

    try {
      const formatted = formatHtmlString(input, indentSize)
      setOutput(formatted)
      setError(null)
    } catch (e) {
      setError(`Error al formatear: ${(e as Error).message}`)
      setOutput("")
    }
  }

  const formatHtmlString = (html: string, indent: number): string => {
    const indentStr = " ".repeat(indent)
    let result = ""
    let level = 0
    let i = 0

    const selfClosingTags = ["br", "hr", "img", "input", "meta", "link", "area", "base", "col", "embed", "source", "track", "wbr"]

    while (i < html.length) {
      if (html[i] === "<") {
        const endTag = html.indexOf(">", i)
        if (endTag === -1) break

        const tag = html.substring(i, endTag + 1)
        const tagContent = tag.substring(1, tag.length - 1)

        if (tagContent.startsWith("!")) {
          result += indentStr.repeat(level) + tag + "\n"
        } else if (tagContent.startsWith("/")) {
          level = Math.max(0, level - 1)
          result += indentStr.repeat(level) + tag + "\n"
        } else {
          const tagName = tagContent.split(/\s/)[0].toLowerCase()
          result += indentStr.repeat(level) + tag + "\n"
          if (!selfClosingTags.includes(tagName) && !tagContent.endsWith("/")) {
            level++
          }
        }

        i = endTag + 1
      } else {
        const nextTag = html.indexOf("<", i)
        const textContent = nextTag === -1 ? html.substring(i) : html.substring(i, nextTag)
        const trimmed = textContent.trim()

        if (trimmed) {
          result += indentStr.repeat(level) + trimmed + "\n"
        }

        i = nextTag === -1 ? html.length : nextTag
      }
    }

    return result.trim()
  }

  const minifyHtml = () => {
    if (!input.trim()) {
      setError("Por favor ingresa HTML para minificar")
      setOutput("")
      return
    }

    try {
      const minified = input
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/>\s+</g, "><")
        .replace(/\s+/g, " ")
        .trim()
      setOutput(minified)
      setError(null)
    } catch (e) {
      setError(`Error al minificar: ${(e as Error).message}`)
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

  return (
    <div className="flex flex-col gap-4">
      {/* Options Bar */}
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
          </select>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button onClick={formatHtml} className="gap-2">
            <Wand2 className="h-4 w-4" />
            Formatear
          </Button>
          <Button onClick={minifyHtml} variant="secondary" className="gap-2">
            Minificar
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
          <label className="text-sm font-medium text-muted-foreground">Entrada</label>
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder='<div><p>Pega tu HTML aquí...</p></div>'
            className="min-h-[400px] w-full bg-input border border-border rounded-lg p-4 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-muted-foreground">Salida</label>
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
          <div className="min-h-[400px] w-full bg-card border border-border rounded-lg p-4 font-mono text-sm text-foreground overflow-auto">
            {output ? (
              <pre className="whitespace-pre-wrap break-words">{output}</pre>
            ) : (
              <span className="text-muted-foreground/50">
                El HTML formateado aparecerá aquí...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
