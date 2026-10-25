"use client"

import { useEffect, useState } from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Timer } from "lucide-react"

interface CommandPaletteProps {
  onTimerSelect: () => void
}

export function CommandPalette({ onTimerSelect }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleTimerSelect = () => {
    setOpen(false)
    onTimerSelect()
  }

  return (
    <CommandDialog 
      open={open} 
      onOpenChange={setOpen}
      title="Menu de Comandos"
      description="Busca y ejecuta comandos rapidamente"
    >
      <CommandInput placeholder="Buscar comando..." />
      <CommandList>
        <CommandEmpty>No se encontraron comandos.</CommandEmpty>
        <CommandGroup heading="Herramientas">
          <CommandItem onSelect={handleTimerSelect}>
            <Timer className="mr-2 h-4 w-4" />
            <span>Temporizador Inteligente</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
