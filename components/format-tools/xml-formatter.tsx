"use client"

import { useState } from "react"
import { useFormatterStorage } from "@/hooks/use-formatter-storage"
import { Button } from "@/components/ui/button"
import { Copy, Check, Trash2, Wand2, AlertCircle } from "lucide-react"

export function XmlFormatter() {
  const { input, setInput: onInputChange, output, setOutput } = useFormatterStorage("xml")
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [indentSize, setIndentSize] = useState(2)

  const formatXml = () => {
    if (!input.trim()) {
      setError("Por favor ingresa XML para formatear")
      setOutput("")
      return
    }

    try {
      const parser = new DOMParser()
      const dom = parser.parseFromString(input, "text/xml")

      if (dom.getElementsByTagName("parsererror").length > 0) {
        throw new Error("XML inválido")
      }

      const indent = " ".repeat(indentSize)
      const formatted = formatXmlNode(dom.documentElement, 0, indent)
      setOutput(formatted)
      setError(null)
    } catch (e) {
      setError(`XML inválido: ${(e as Error).message}`)
      setOutput("")
    }
  }

  const formatXmlNode = (node: any, level: number, indent: string): string => {
    let result = ""
    const padding = indent.repeat(level)

    if (node.nodeType === 1) {
      result += `${padding}<${node.tagName}`

      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i]
        result += ` ${attr.name}="${attr.value}"`
      }

      if (node.childNodes.length === 0) {
        result += " />\n"
      } else {
        result += ">\n"
        for (let i = 0; i < node.childNodes.length; i++) {
          const child = node.childNodes[i]
          if (child.nodeType === 1) {
            result += formatXmlNode(child, level + 1, indent)
          } else if (child.nodeType === 3 && child.nodeValue.trim()) {
            result += `${padding}${indent}${child.nodeValue.trim()}\n`
          }
        }
        result += `${padding}</${node.tagName}>\n`
      }
    }

    return result
  }

  const minifyXml = () => {
    if (!input.trim()) {
      setError("Por favor ingresa XML para minificar")
      setOutput("")
      return
    }

    try {
      const parser = new DOMParser()
      const dom = parser.parseFromString(input, "text/xml")

      if (dom.getElementsByTagName("parsererror").length > 0) {
        throw new Error("XML inválido")
      }

      const minified = new XMLSerializer().serializeToString(dom.documentElement)
      setOutput(minified)
      setError(null)
    } catch (e) {
      setError(`XML inválido: ${(e as Error).message}`)
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
            <option value={1}>Tab</option>
          </select>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button onClick={formatXml} className="gap-2">
            <Wand2 className="h-4 w-4" />
            Formatear
          </Button>
          <Button onClick={minifyXml} variant="secondary" className="gap-2">
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
            placeholder='<root><item>Pega tu XML aquí...</item></root>'
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
                El XML formateado aparecerá aquí...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
