"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, SplitSquareHorizontal, AlignJustify } from "lucide-react"
import { cn } from "@/lib/utils"

type DiffMode = "lines" | "words"
type ViewMode = "split" | "unified"

interface DiffPart {
  value: string
  added?: boolean
  removed?: boolean
}

interface DiffLine {
  left: { text: string; type: "added" | "removed" | "equal" } | null
  right: { text: string; type: "added" | "removed" | "equal" } | null
  lineNumLeft: number | null
  lineNumRight: number | null
}

// Longest Common Subsequence for line-level diff
function lcs<T>(a: T[], b: T[], key: (v: T) => string): number[][] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (key(a[i - 1]) === key(b[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  return dp
}

function diffLines(left: string, right: string): DiffLine[] {
  const leftLines = left.split("\n")
  const rightLines = right.split("\n")

  const dp = lcs(leftLines, rightLines, (v) => v)

  // Backtrack to get diff operations
  const ops: Array<{ type: "equal" | "removed" | "added"; value: string }> = []
  let i = leftLines.length
  let j = rightLines.length

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      ops.unshift({ type: "equal", value: leftLines[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: "added", value: rightLines[j - 1] })
      j--
    } else {
      ops.unshift({ type: "removed", value: leftLines[i - 1] })
      i--
    }
  }

  // Build split view lines
  const result: DiffLine[] = []
  let leftNum = 0
  let rightNum = 0

  // Group consecutive removed/added for side-by-side pairing
  let idx = 0
  while (idx < ops.length) {
    const op = ops[idx]
    if (op.type === "equal") {
      leftNum++
      rightNum++
      result.push({
        left: { text: op.value, type: "equal" },
        right: { text: op.value, type: "equal" },
        lineNumLeft: leftNum,
        lineNumRight: rightNum,
      })
      idx++
    } else {
      // Collect consecutive removed and added
      const removed: string[] = []
      const added: string[] = []
      while (idx < ops.length && (ops[idx].type === "removed" || ops[idx].type === "added")) {
        if (ops[idx].type === "removed") removed.push(ops[idx].value)
        else added.push(ops[idx].value)
        idx++
      }
      const maxLen = Math.max(removed.length, added.length)
      for (let k = 0; k < maxLen; k++) {
        const lText = removed[k] ?? null
        const rText = added[k] ?? null
        if (lText !== null) leftNum++
        if (rText !== null) rightNum++
        result.push({
          left: lText !== null ? { text: lText, type: "removed" } : null,
          right: rText !== null ? { text: rText, type: "added" } : null,
          lineNumLeft: lText !== null ? leftNum : null,
          lineNumRight: rText !== null ? rightNum : null,
        })
      }
    }
  }

  return result
}

function diffWords(left: string, right: string): DiffPart[] {
  const leftWords = left.split(/(\s+)/)
  const rightWords = right.split(/(\s+)/)

  const dp = lcs(leftWords, rightWords, (v) => v)

  const parts: DiffPart[] = []
  let i = leftWords.length
  let j = rightWords.length
  const ops: Array<{ type: "equal" | "removed" | "added"; value: string }> = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftWords[i - 1] === rightWords[j - 1]) {
      ops.unshift({ type: "equal", value: leftWords[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: "added", value: rightWords[j - 1] })
      j--
    } else {
      ops.unshift({ type: "removed", value: leftWords[i - 1] })
      i--
    }
  }

  for (const op of ops) {
    parts.push({
      value: op.value,
      added: op.type === "added",
      removed: op.type === "removed",
    })
  }

  return parts
}

export function TextComparer() {
  const [leftText, setLeftText] = useState(() => {
    if (typeof window === "undefined") return ""
    return localStorage.getItem("comparer-left") || ""
  })
  const [rightText, setRightText] = useState(() => {
    if (typeof window === "undefined") return ""
    return localStorage.getItem("comparer-right") || ""
  })
  const [diffMode, setDiffMode] = useState<DiffMode>("lines")
  const [viewMode, setViewMode] = useState<ViewMode>("split")
  const [compared, setCompared] = useState(false)

  // Save to localStorage when texts change
  const handleLeftChange = (text: string) => {
    setLeftText(text)
    localStorage.setItem("comparer-left", text)
  }

  const handleRightChange = (text: string) => {
    setRightText(text)
    localStorage.setItem("comparer-right", text)
  }

  const diffResult = useMemo(() => {
    if (!compared) return null
    if (diffMode === "lines") return diffLines(leftText, rightText)
    return diffWords(leftText, rightText)
  }, [compared, leftText, rightText, diffMode])

  const stats = useMemo(() => {
    if (!diffResult || diffMode === "words") return null
    const lines = diffResult as DiffLine[]
    const added = lines.filter((l) => l.right?.type === "added" && l.left === null || (l.right?.type === "added" && l.left?.type !== "equal")).length
    const removed = lines.filter((l) => l.left?.type === "removed").length
    const equal = lines.filter((l) => l.left?.type === "equal").length
    return { added, removed, equal }
  }, [diffResult, diffMode])

  const handleCompare = () => setCompared(true)
  const handleClear = () => {
    handleLeftChange("")
    handleRightChange("")
    setCompared(false)
  }

  const handleModeChange = (mode: DiffMode) => {
    setDiffMode(mode)
    setCompared(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Text Comparer</h2>
          <p className="text-sm text-muted-foreground">Compara dos textos y visualiza las diferencias</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Diff mode */}
          <div className="flex items-center bg-secondary rounded-lg p-1 gap-1">
            <button
              onClick={() => handleModeChange("lines")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                diffMode === "lines" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Por líneas
            </button>
            <button
              onClick={() => handleModeChange("words")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                diffMode === "words" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Por palabras
            </button>
          </div>

          {/* View mode (only for lines) */}
          {diffMode === "lines" && (
            <div className="flex items-center bg-secondary rounded-lg p-1 gap-1">
              <button
                onClick={() => setViewMode("split")}
                className={cn(
                  "px-2 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1",
                  viewMode === "split" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <SplitSquareHorizontal className="h-3 w-3" />
                Split
              </button>
              <button
                onClick={() => setViewMode("unified")}
                className={cn(
                  "px-2 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1",
                  viewMode === "unified" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <AlignJustify className="h-3 w-3" />
                Unified
              </button>
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground hover:text-foreground">
            <Trash2 className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        </div>
      </div>

      {/* Input areas */}
      {!compared && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Texto Original</label>
            <textarea
              value={leftText}
              onChange={(e) => handleLeftChange(e.target.value)}
              placeholder="Pega el texto original aquí..."
              className="h-72 w-full resize-none rounded-lg border border-border bg-card p-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Texto Modificado</label>
            <textarea
              value={rightText}
              onChange={(e) => handleRightChange(e.target.value)}
              placeholder="Pega el texto modificado aquí..."
              className="h-72 w-full resize-none rounded-lg border border-border bg-card p-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      )}

      {/* Compare button */}
      {!compared && (
        <Button
          onClick={handleCompare}
          disabled={!leftText.trim() || !rightText.trim()}
          className="self-start"
        >
          Comparar
        </Button>
      )}

      {/* Stats */}
      {compared && diffMode === "lines" && stats && (
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500/40 border border-emerald-500" />
            <span className="text-muted-foreground">{stats.added} líneas añadidas</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500/40 border border-red-500" />
            <span className="text-muted-foreground">{stats.removed} líneas eliminadas</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-secondary border border-border" />
            <span className="text-muted-foreground">{stats.equal} sin cambios</span>
          </span>
          <button
            onClick={() => setCompared(false)}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Editar textos
          </button>
        </div>
      )}

      {/* Diff output - Lines Split */}
      {compared && diffMode === "lines" && viewMode === "split" && diffResult && (
        <div className="rounded-lg border border-border overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-2 border-b border-border bg-secondary/50">
            <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-r border-border">Original</div>
            <div className="px-4 py-2 text-xs font-medium text-muted-foreground">Modificado</div>
          </div>
          <div className="overflow-auto max-h-[60vh]">
            {(diffResult as DiffLine[]).map((line, idx) => (
              <div key={idx} className="grid grid-cols-2 border-b border-border/50 last:border-b-0 text-sm font-mono">
                {/* Left */}
                <div
                  className={cn(
                    "flex items-start gap-0 border-r border-border/50 min-h-[28px]",
                    line.left?.type === "removed" && "bg-red-500/10",
                    line.left?.type === "equal" && "bg-transparent",
                    !line.left && "bg-secondary/20"
                  )}
                >
                  <span className={cn(
                    "select-none w-10 shrink-0 text-right pr-3 py-1 text-xs border-r border-border/50",
                    line.left?.type === "removed" ? "bg-red-500/20 text-red-400" : "text-muted-foreground/50 bg-secondary/30"
                  )}>
                    {line.lineNumLeft ?? ""}
                  </span>
                  <span className={cn(
                    "px-3 py-1 whitespace-pre-wrap break-all flex-1",
                    line.left?.type === "removed" ? "text-red-300" : "text-foreground"
                  )}>
                    {line.left?.type === "removed" && <span className="text-red-500 font-bold mr-1 select-none">-</span>}
                    {line.left?.text ?? ""}
                  </span>
                </div>
                {/* Right */}
                <div
                  className={cn(
                    "flex items-start gap-0 min-h-[28px]",
                    line.right?.type === "added" && "bg-emerald-500/10",
                    line.right?.type === "equal" && "bg-transparent",
                    !line.right && "bg-secondary/20"
                  )}
                >
                  <span className={cn(
                    "select-none w-10 shrink-0 text-right pr-3 py-1 text-xs border-r border-border/50",
                    line.right?.type === "added" ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground/50 bg-secondary/30"
                  )}>
                    {line.lineNumRight ?? ""}
                  </span>
                  <span className={cn(
                    "px-3 py-1 whitespace-pre-wrap break-all flex-1",
                    line.right?.type === "added" ? "text-emerald-300" : "text-foreground"
                  )}>
                    {line.right?.type === "added" && <span className="text-emerald-500 font-bold mr-1 select-none">+</span>}
                    {line.right?.text ?? ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diff output - Lines Unified */}
      {compared && diffMode === "lines" && viewMode === "unified" && diffResult && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border bg-secondary/50">
            Vista unificada
          </div>
          <div className="overflow-auto max-h-[60vh] font-mono text-sm">
            {(diffResult as DiffLine[]).map((line, idx) => {
              if (line.left?.type === "equal") {
                return (
                  <div key={idx} className="flex items-start border-b border-border/30 last:border-b-0 min-h-[28px]">
                    <span className="select-none w-8 shrink-0 text-center py-1 text-xs text-muted-foreground/50 bg-secondary/30 border-r border-border/50">{line.lineNumLeft}</span>
                    <span className="select-none w-8 shrink-0 text-center py-1 text-xs text-muted-foreground/50 bg-secondary/30 border-r border-border/50">{line.lineNumRight}</span>
                    <span className="px-3 py-1 whitespace-pre-wrap break-all text-foreground flex-1">{line.left.text}</span>
                  </div>
                )
              }
              return (
                <div key={idx}>
                  {line.left && (
                    <div className="flex items-start border-b border-border/30 last:border-b-0 bg-red-500/10 min-h-[28px]">
                      <span className="select-none w-8 shrink-0 text-center py-1 text-xs text-red-400 bg-red-500/20 border-r border-border/50">{line.lineNumLeft}</span>
                      <span className="select-none w-8 shrink-0 text-center py-1 text-xs text-muted-foreground/50 bg-secondary/30 border-r border-border/50"></span>
                      <span className="px-3 py-1 whitespace-pre-wrap break-all text-red-300 flex-1">
                        <span className="text-red-500 font-bold mr-1 select-none">-</span>{line.left.text}
                      </span>
                    </div>
                  )}
                  {line.right && (
                    <div className="flex items-start border-b border-border/30 last:border-b-0 bg-emerald-500/10 min-h-[28px]">
                      <span className="select-none w-8 shrink-0 text-center py-1 text-xs text-muted-foreground/50 bg-secondary/30 border-r border-border/50"></span>
                      <span className="select-none w-8 shrink-0 text-center py-1 text-xs text-emerald-400 bg-emerald-500/20 border-r border-border/50">{line.lineNumRight}</span>
                      <span className="px-3 py-1 whitespace-pre-wrap break-all text-emerald-300 flex-1">
                        <span className="text-emerald-500 font-bold mr-1 select-none">+</span>{line.right.text}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Diff output - Words */}
      {compared && diffMode === "words" && diffResult && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border bg-secondary/50">
            Diferencias por palabra
          </div>
          <div className="p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words overflow-auto max-h-[60vh]">
            {(diffResult as DiffPart[]).map((part, idx) => (
              <span
                key={idx}
                className={cn(
                  part.added && "bg-emerald-500/20 text-emerald-300 rounded px-0.5",
                  part.removed && "bg-red-500/20 text-red-300 line-through rounded px-0.5",
                  !part.added && !part.removed && "text-foreground"
                )}
              >
                {part.value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* No diff message */}
      {compared && diffResult && diffMode === "lines" && (diffResult as DiffLine[]).every((l) => l.left?.type === "equal") && (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Los textos son idénticos, no hay diferencias.</p>
        </div>
      )}
    </div>
  )
}
