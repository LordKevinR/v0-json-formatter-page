"use client"

import { useState } from "react"
import { ToolSidebar, type ToolType } from "@/components/format-tools/tool-sidebar"
import { JsonFormatter } from "@/components/format-tools/json-formatter"
import { XmlFormatter } from "@/components/format-tools/xml-formatter"
import { SqlFormatter } from "@/components/format-tools/sql-formatter"
import { HtmlFormatter } from "@/components/format-tools/html-formatter"
import { CssFormatter } from "@/components/format-tools/css-formatter"
import { YamlFormatter } from "@/components/format-tools/yaml-formatter"
import { Base64Formatter } from "@/components/format-tools/base64-formatter"
import { MarkdownFormatter } from "@/components/format-tools/markdown-formatter"
import { TextComparer } from "@/components/format-tools/text-comparer"
import { VideoCompressor } from "@/components/format-tools/video-compressor"
import { CommandPalette } from "@/components/command-palette"
import { TimerModal } from "@/components/timer/timer-modal"
import { TimerDisplay } from "@/components/timer/timer-display"
import { Braces } from "lucide-react"

export default function FormatPage() {
  const [activeTool, setActiveTool] = useState<ToolType>("json")
  const [timerModalOpen, setTimerModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <CommandPalette onTimerSelect={() => setTimerModalOpen(true)} />
      <TimerModal open={timerModalOpen} onOpenChange={setTimerModalOpen} />
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-primary-foreground">
              <Braces className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">DevFormat</h1>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Herramientas de formateo para desarrolladores
                </p>
                <TimerDisplay />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <ToolSidebar activeTool={activeTool} onToolChange={setActiveTool} />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {activeTool === "json" && <JsonFormatter />}
            {activeTool === "xml" && <XmlFormatter />}
            {activeTool === "sql" && <SqlFormatter />}
            {activeTool === "html" && <HtmlFormatter />}
            {activeTool === "css" && <CssFormatter />}
            {activeTool === "yaml" && <YamlFormatter />}
            {activeTool === "base64" && <Base64Formatter />}
            {activeTool === "markdown" && <MarkdownFormatter />}
            {activeTool === "text-comparer" && <TextComparer />}
            {activeTool === "video-compressor" && <VideoCompressor />}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-sm text-muted-foreground text-center">
            DevFormat — Formatea tu código de manera rápida y sencilla
          </p>
        </div>
      </footer>
    </div>
  )
}
