"use client"

import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { 
  Braces, 
  FileCode2, 
  Database, 
  FileText, 
  Code2, 
  Hash,
  FileJson,
  Settings2,
  GitCompare,
  Video,
  Server
} from "lucide-react"

export type ToolType = "json" | "xml" | "sql" | "html" | "css" | "base64" | "yaml" | "markdown" | "text-comparer" | "video-compressor" | "video-compressor-server"

interface Tool {
  id: ToolType
  name: string
  icon: React.ReactNode
  available: boolean
}

const tools: Tool[] = [
  { id: "json", name: "JSON", icon: <Braces className="h-4 w-4" />, available: true },
  { id: "xml", name: "XML", icon: <FileCode2 className="h-4 w-4" />, available: true },
  { id: "sql", name: "SQL", icon: <Database className="h-4 w-4" />, available: true },
  { id: "html", name: "HTML", icon: <FileText className="h-4 w-4" />, available: true },
  { id: "css", name: "CSS", icon: <Code2 className="h-4 w-4" />, available: true },
  { id: "yaml", name: "YAML", icon: <FileJson className="h-4 w-4" />, available: true },
  { id: "base64", name: "Base64", icon: <Hash className="h-4 w-4" />, available: true },
  { id: "markdown", name: "Markdown", icon: <Settings2 className="h-4 w-4" />, available: true },
  { id: "text-comparer", name: "Text Comparer", icon: <GitCompare className="h-4 w-4" />, available: true },
  { id: "video-compressor", name: "Comprimir Video", icon: <Video className="h-4 w-4" />, available: true },
  { id: "video-compressor-server", name: "Comprimir Video (Servidor)", icon: <Server className="h-4 w-4" />, available: true },
]

interface ToolSidebarProps {
  activeTool: ToolType
  onToolChange: (tool: ToolType) => void
}

export function ToolSidebar({ activeTool, onToolChange }: ToolSidebarProps) {
  const navRef = useRef<HTMLElement>(null)
  const buttonRefs = useRef<Map<ToolType, HTMLButtonElement>>(new Map())
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0, opacity: 0 })

  useEffect(() => {
    const activeButton = buttonRefs.current.get(activeTool)
    if (activeButton && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect()
      const buttonRect = activeButton.getBoundingClientRect()
      setIndicatorStyle({
        top: buttonRect.top - navRect.top,
        height: buttonRect.height,
        opacity: 1,
      })
    }
  }, [activeTool])

  return (
    <aside className="w-full md:w-56 shrink-0">
      <nav ref={navRef} className="relative flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
        {/* Sliding indicator */}
        <div
          className="absolute left-0 right-0 bg-primary rounded-lg transition-all duration-300 ease-out hidden md:block"
          style={{
            top: indicatorStyle.top,
            height: indicatorStyle.height,
            opacity: indicatorStyle.opacity,
          }}
        />
        
        {tools.map((tool) => (
          <button
            key={tool.id}
            ref={(el) => {
              if (el) buttonRefs.current.set(tool.id, el)
            }}
            onClick={() => tool.available && onToolChange(tool.id)}
            disabled={!tool.available}
            className={cn(
              "relative z-10 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 whitespace-nowrap",
              activeTool === tool.id
                ? "text-primary-foreground md:bg-transparent bg-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/80",
              !tool.available && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
            )}
          >
            {tool.icon}
            <span>{tool.name}</span>
            {!tool.available && (
              <span className="text-xs bg-secondary/50 px-1.5 py-0.5 rounded ml-auto">
                Pronto
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  )
}
