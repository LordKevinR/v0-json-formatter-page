// Shared in-memory registry of finished compression jobs.
// Note: this works for a single long-running server (dev / self-hosted / VPS).
// On stateless serverless deployments each request may hit a different instance,
// so the download route should run on the same instance that produced the file.

export interface Job {
  path: string
  size: number
  name: string
  mime: string
  createdAt: number
}

const globalForJobs = globalThis as unknown as { __videoJobs?: Map<string, Job> }

export const jobs: Map<string, Job> = globalForJobs.__videoJobs ?? new Map()
globalForJobs.__videoJobs = jobs

// Best-effort cleanup of stale jobs (older than 30 min).
const MAX_AGE = 30 * 60 * 1000
export function pruneJobs() {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (now - job.createdAt > MAX_AGE) jobs.delete(id)
  }
}
