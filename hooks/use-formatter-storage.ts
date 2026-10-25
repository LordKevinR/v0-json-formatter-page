import { useState, useEffect, useCallback } from "react"

export function useFormatterStorage(key: string) {
  const storageKey = `devformat:${key}`

  const [input, setInput] = useState<string>(() => {
    if (typeof window === "undefined") return ""
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) return JSON.parse(saved).input ?? ""
    } catch {}
    return ""
  })

  const [output, setOutput] = useState<string>(() => {
    if (typeof window === "undefined") return ""
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) return JSON.parse(saved).output ?? ""
    } catch {}
    return ""
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ input, output }))
    } catch {}
  }, [input, output, storageKey])

  const clear = useCallback(() => {
    setInput("")
    setOutput("")
    try {
      localStorage.removeItem(storageKey)
    } catch {}
  }, [storageKey])

  return { input, setInput, output, setOutput, clear }
}
