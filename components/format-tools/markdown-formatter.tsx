"use client"

import { useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import { useFormatterStorage } from "@/hooks/use-formatter-storage"
import { Button } from "@/components/ui/button"
import { Copy, Check, Trash2, AlertCircle, Download, Loader2 } from "lucide-react"

export function MarkdownFormatter() {
  const { input, setInput: onInputChange, output, setOutput } = useFormatterStorage("markdown")
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const renderMarkdown = () => {
    if (!input.trim()) {
      setError("Por favor ingresa Markdown para renderizar")
      setOutput("")
      return
    }

    try {
      setOutput(input)
      setError(null)
    } catch (e) {
      setError(`Error al procesar: ${(e as Error).message}`)
      setOutput("")
    }
  }

  const copyToClipboard = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const [isDownloading, setIsDownloading] = useState(false)

  const downloadPdf = async () => {
    if (!output || !previewRef.current || isDownloading) return

    setIsDownloading(true)
    setError(null)
    // Render inside an isolated iframe so the app's Tailwind stylesheet (which
    // may contain lab()/oklab() colors) cannot be inspected by html2canvas.
    const frame = document.createElement("iframe")
    frame.setAttribute("title", "PDF rendering surface")
    frame.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;visibility:hidden;"
    document.body.appendChild(frame)
    const frameDocument = frame.contentDocument
    if (!frameDocument) throw new Error("No se pudo crear el documento del PDF")

    const pdfContent = frameDocument.createElement("div")
    pdfContent.style.cssText = "width:794px;min-height:1123px;padding:56px;background:#ffffff;color:#1f2937;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;"
    pdfContent.innerHTML = previewRef.current.innerHTML
    pdfContent.querySelectorAll("[class]").forEach((element) => element.removeAttribute("class"))
    const pdfStyles = frameDocument.createElement("style")
    pdfStyles.textContent = `
      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; background: #ffffff; color: #1f2937; }
      h1 { font-size: 30px; line-height: 1.2; margin: 24px 0 16px; font-weight: 700; }
      h2 { font-size: 24px; line-height: 1.25; margin: 20px 0 12px; font-weight: 700; }
      h3 { font-size: 20px; line-height: 1.3; margin: 16px 0 8px; font-weight: 700; }
      p { margin: 0 0 16px; line-height: 1.6; }
      ul, ol { margin: 0 0 16px 24px; padding: 0; }
      li { margin-bottom: 4px; }
      blockquote { margin: 0 0 16px; padding-left: 16px; border-left: 4px solid #64748b; font-style: italic; }
      a { color: #2563eb; text-decoration: underline; }
      code { font-family: monospace; font-size: 13px; }
      pre { background: #e2e8f0; color: #1e293b; border-radius: 6px; padding: 12px; overflow: hidden; margin: 0 0 16px; white-space: pre-wrap; }
      pre code { font-size: 13px; }
    `
    frameDocument.head.appendChild(pdfStyles)
    frameDocument.body.appendChild(pdfContent)

    try {
      const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ])
      const canvas = await html2canvas(pdfContent, { scale: 2, backgroundColor: "#ffffff", useCORS: true })
      const pdf = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait" })
      const pageWidth = 210
      const pageHeight = 297
      const margin = 14
      const imageWidth = pageWidth - margin * 2
      const contentHeight = pageHeight - margin * 2
      const renderedImageHeight = (canvas.height * imageWidth) / canvas.width
      const pixelsPerMm = canvas.width / imageWidth
      const pageCanvasHeight = Math.floor(contentHeight * pixelsPerMm)
      let sourceY = 0

      while (sourceY < canvas.height) {
        if (sourceY > 0) pdf.addPage()

        const sliceHeight = Math.min(pageCanvasHeight, canvas.height - sourceY)
        const pageCanvas = document.createElement("canvas")
        pageCanvas.width = canvas.width
        pageCanvas.height = sliceHeight
        const pageContext = pageCanvas.getContext("2d")
        if (!pageContext) throw new Error("No se pudo preparar una página del PDF")

        pageContext.fillStyle = "#ffffff"
        pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
        pageContext.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sliceHeight,
          0,
          0,
          pageCanvas.width,
          sliceHeight,
        )

        const sliceImageHeight = (sliceHeight * imageWidth) / canvas.width
        pdf.addImage(pageCanvas, "PNG", margin, margin, imageWidth, sliceImageHeight)
        sourceY += sliceHeight
      }

      pdf.save("markdown-document.pdf")
    } catch (e) {
      setError(`No se pudo generar el PDF: ${(e as Error).message}`)
    } finally {
      frame.remove()
      setIsDownloading(false)
    }
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
        <div className="flex gap-2 ml-auto">
          <Button onClick={renderMarkdown} className="gap-2">
            Renderizar
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
          <label className="text-sm font-medium text-muted-foreground">Markdown</label>
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={'# Título\n\n**Texto en negrita**\n\n- Lista\n- De\n- Elementos'}
            className="min-h-[400px] w-full bg-input border border-border rounded-lg p-4 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            spellCheck={false}
          />
        </div>

        {/* Output - Rendered HTML */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-muted-foreground">Vista previa</label>
            {output && (
              <div className="flex items-center gap-1">
                <Button
                  onClick={downloadPdf}
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {isDownloading ? "Generando PDF..." : "Descargar PDF"}
                </Button>
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
              </div>
            )}
          </div>
          <div ref={previewRef} className="min-h-[400px] w-full bg-card border border-border rounded-lg p-4 overflow-auto prose prose-invert max-w-none">
            {output ? (
              <ReactMarkdown
                components={{
                  h1: ({node, ...props}) => <h1 className="text-3xl font-bold mb-4 mt-6" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-2xl font-bold mb-3 mt-5" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-xl font-bold mb-2 mt-4" {...props} />,
                  p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
                  ul: ({node, ...props}) => <ul className="mb-4 ml-6 list-disc" {...props} />,
                  ol: ({node, ...props}) => <ol className="mb-4 ml-6 list-decimal" {...props} />,
                  li: ({node, ...props}) => <li className="mb-1" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="mb-4 pl-4 border-l-4 border-primary/50 italic" {...props} />,
                  code: ({node, inline, ...props}: any) => 
                    inline ? (
                      <code className="bg-secondary/50 rounded px-1.5 py-0.5 font-mono text-sm" {...props} />
                    ) : (
                      <pre className="bg-secondary/50 rounded p-3 overflow-x-auto mb-4">
                        <code className="font-mono text-sm" {...props} />
                      </pre>
                    ),
                  a: ({node, ...props}) => <a className="text-primary hover:underline" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                  em: ({node, ...props}) => <em className="italic" {...props} />,
                }}
              >
                {output}
              </ReactMarkdown>
            ) : (
              <span className="text-muted-foreground/50">
                La vista previa aparecerá aquí...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
