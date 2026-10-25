"use client"

import { useState } from "react"
import { format } from "sql-formatter"
import { useFormatterStorage } from "@/hooks/use-formatter-storage"
import { Button } from "@/components/ui/button"
import { Copy, Check, Trash2, Wand2, AlertCircle, Download } from "lucide-react"

type SqlLanguage = "sql" | "tsql" | "mysql" | "postgresql" | "plsql"

export function SqlFormatter() {
  const { input, setInput: onInputChange, output, setOutput } = useFormatterStorage("sql")
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [indentSize, setIndentSize] = useState(4)
  const [dialect, setDialect] = useState<SqlLanguage>("tsql")

  const formatSql = () => {
    if (!input.trim()) {
      setError("Por favor ingresa SQL para formatear")
      setOutput("")
      return
    }

    try {
      const formatted = format(input, {
        language: dialect,
        tabWidth: indentSize,
        useTabs: false,
        keywordCase: "upper",
        indentStyle: "standard",
        logicalOperatorNewline: "before",
        expressionWidth: 50,
      })
      setOutput(formatted)
      setError(null)
    } catch (e) {
      setError(`Error al formatear: ${(e as Error).message}`)
      setOutput("")
    }
  }

  const minifySql = () => {
    if (!input.trim()) {
      setError("Por favor ingresa SQL para minificar")
      setOutput("")
      return
    }

    try {
      const minified = input
        .replace(/--.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
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

  const downloadSql = () => {
    const content = output || input
    if (!content.trim()) {
      setError("Por favor ingresa SQL para descargar")
      return
    }

    const blob = new Blob([content], { type: "application/sql;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "script.sql"
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setError(null)
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
          <label className="text-sm text-muted-foreground">Dialecto:</label>
          <select
            value={dialect}
            onChange={(e) => setDialect(e.target.value as SqlLanguage)}
            className="bg-input border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="tsql">SQL Server (T-SQL)</option>
            <option value="mysql">MySQL</option>
            <option value="postgresql">PostgreSQL</option>
            <option value="plsql">Oracle (PL/SQL)</option>
            <option value="sql">SQL Estándar</option>
          </select>
        </div>
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
          <Button onClick={formatSql} className="gap-2">
            <Wand2 className="h-4 w-4" />
            Formatear
          </Button>
          <Button onClick={minifySql} variant="secondary" className="gap-2">
            Minificar
          </Button>
          <Button onClick={downloadSql} variant="outline" className="gap-2" disabled={!input.trim() && !output.trim()}>
            <Download className="h-4 w-4" />
            Descargar .sql
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
            placeholder="Pega tu SQL aquí..."
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
              <pre className="whitespace-pre">{output}</pre>
            ) : (
              <span className="text-muted-foreground/50">
                El SQL formateado aparecerá aquí...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
