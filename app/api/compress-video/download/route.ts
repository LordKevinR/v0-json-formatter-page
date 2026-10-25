import { NextRequest } from "next/server"
import { createReadStream } from "node:fs"
import { unlink } from "node:fs/promises"
import { Readable } from "node:stream"
import { jobs, pruneJobs } from "../jobs"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  pruneJobs()
  const id = new URL(req.url).searchParams.get("id")
  if (!id) return new Response("Missing id", { status: 400 })

  const job = jobs.get(id)
  if (!job) return new Response("Not found or expired", { status: 404 })

  const nodeStream = createReadStream(job.path)
  nodeStream.on("close", async () => {
    // Delete the temp file and free the job once downloaded.
    try {
      await unlink(job.path)
    } catch {
      // ignore
    }
    jobs.delete(id)
  })

  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream

  return new Response(webStream, {
    headers: {
      "Content-Type": job.mime,
      "Content-Length": String(job.size),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(job.name)}"`,
      "Cache-Control": "no-store",
    },
  })
}
