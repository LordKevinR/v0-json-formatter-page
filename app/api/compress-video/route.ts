import { NextRequest } from "next/server"
import { spawn } from "node:child_process"
import { Readable } from "node:stream"
import { createWriteStream } from "node:fs"
import { mkdir, stat, unlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { randomUUID } from "node:crypto"
import ffmpegPath from "ffmpeg-static"
import { jobs } from "./jobs"

// Node runtime is required for child_process / filesystem access.
export const runtime = "nodejs"
// Allow long-running compression (seconds). On Vercel this is capped by your plan.
export const maxDuration = 300

const WORK_DIR = join(tmpdir(), "devformat-video")

interface Options {
  crf: number
  format: "mp4" | "mp4-h265" | "webm"
  preset: string
  scale: number // 0 = keep original
}

function buildArgs(input: string, output: string, opts: Options): string[] {
  const args = ["-y", "-i", input, "-threads", "0"]

  // Optional downscale (keeps aspect ratio, ensures even dimensions).
  if (opts.scale > 0) {
    args.push("-vf", `scale=-2:${opts.scale}`)
  }

  switch (opts.format) {
    case "mp4":
      args.push(
        "-c:v", "libx264",
        "-crf", String(opts.crf),
        "-preset", opts.preset,
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
      )
      break
    case "mp4-h265":
      args.push(
        "-c:v", "libx265",
        "-crf", String(opts.crf),
        "-preset", opts.preset,
        "-tag:v", "hvc1",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
      )
      break
    case "webm":
      args.push(
        "-c:v", "libvpx-vp9",
        "-crf", String(opts.crf),
        "-b:v", "0",
        "-row-mt", "1",
        "-deadline", "good",
        "-cpu-used", "2",
        "-c:a", "libopus",
      )
      break
  }

  // Machine-readable progress on stdout.
  args.push("-progress", "pipe:1", "-nostats", output)
  return args
}

function parseDuration(line: string): number | null {
  // e.g. "  Duration: 00:01:23.45, start: ..."
  const m = line.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/)
  if (!m) return null
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

export async function POST(req: NextRequest) {
  if (!ffmpegPath) {
    return new Response("ffmpeg binary not available", { status: 500 })
  }
  if (!req.body) {
    return new Response("No file provided", { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const opts: Options = {
    crf: Math.min(51, Math.max(0, Number(searchParams.get("crf")) || 28)),
    format: (searchParams.get("format") as Options["format"]) || "mp4",
    preset: searchParams.get("preset") || "medium",
    scale: Number(searchParams.get("scale")) || 0,
  }
  const originalName = searchParams.get("name") || "video"

  await mkdir(WORK_DIR, { recursive: true })
  const id = randomUUID()
  const inputPath = join(WORK_DIR, `${id}-in`)
  const ext = opts.format === "webm" ? "webm" : "mp4"
  const outputPath = join(WORK_DIR, `${id}-out.${ext}`)

  // Stream the upload straight to disk (no full in-memory buffering).
  await new Promise<void>((resolve, reject) => {
    const ws = createWriteStream(inputPath)
    Readable.fromWeb(req.body as import("stream/web").ReadableStream).pipe(ws)
    ws.on("finish", () => resolve())
    ws.on("error", reject)
  })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const ff = spawn(ffmpegPath as string, buildArgs(inputPath, outputPath, opts))
      let duration = 0
      let stderrTail = ""

      ff.stderr.on("data", (chunk: Buffer) => {
        const text = chunk.toString()
        stderrTail = (stderrTail + text).slice(-2000)
        if (!duration) {
          const d = parseDuration(text)
          if (d) {
            duration = d
            send({ type: "duration", duration })
          }
        }
      })

      ff.stdout.on("data", (chunk: Buffer) => {
        const text = chunk.toString()
        for (const line of text.split("\n")) {
          const [key, value] = line.split("=")
          if (key === "out_time_us" && duration > 0) {
            const seconds = Number(value) / 1_000_000
            const percent = Math.min(99, Math.round((seconds / duration) * 100))
            if (!Number.isNaN(percent)) send({ type: "progress", percent })
          }
        }
      })

      ff.on("error", (err) => {
        send({ type: "error", message: err.message })
        controller.close()
        cleanup()
      })

      ff.on("close", async (code) => {
        if (code !== 0) {
          send({ type: "error", message: `ffmpeg exited (${code})`, detail: stderrTail })
          await safeUnlink(outputPath)
          controller.close()
          await safeUnlink(inputPath)
          return
        }
        try {
          const info = await stat(outputPath)
          const baseName = originalName.replace(/\.[^/.]+$/, "")
          jobs.set(id, {
            path: outputPath,
            size: info.size,
            name: `${baseName}_comprimido.${ext}`,
            mime: ext === "webm" ? "video/webm" : "video/mp4",
            createdAt: Date.now(),
          })
          send({ type: "done", id, size: info.size })
        } catch (err) {
          send({ type: "error", message: (err as Error).message })
        } finally {
          controller.close()
          await safeUnlink(inputPath)
        }
      })

      async function cleanup() {
        await safeUnlink(inputPath)
        await safeUnlink(outputPath)
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}

async function safeUnlink(p: string) {
  try {
    await unlink(p)
  } catch {
    // ignore
  }
}
