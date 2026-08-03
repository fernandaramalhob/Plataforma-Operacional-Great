import os from "node:os"
import { logInfo } from "@/lib/safe-logger"

type ReleaseFn = () => void

type AcquireOptions = {
  reportId?: string | null
  label: string
  signal?: AbortSignal
  timeoutMs?: number
}

type QueueEntry = {
  resolve: (release: ReleaseFn) => void
  reject: (error: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
  abortHandler?: () => void
  acquired: boolean
  options: AcquireOptions
}

const MIN_CONCURRENCY = 1
const MAX_CONCURRENCY_CAP = 4

function parsePositiveInteger(value: string | undefined) {
  if (!value) {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function resolveDefaultConcurrency() {
  const memoryGb = os.totalmem() / (1024 * 1024 * 1024)

  if (memoryGb < 4) {
    return 1
  }

  if (memoryGb < 8) {
    return 2
  }

  return 3
}

const configuredConcurrency =
  parsePositiveInteger(process.env.PDF_MAX_CONCURRENCY) ??
  resolveDefaultConcurrency()

const MAX_CONCURRENCY = Math.min(
  Math.max(configuredConcurrency, MIN_CONCURRENCY),
  MAX_CONCURRENCY_CAP
)

const DEFAULT_TIMEOUT_MS =
  parsePositiveInteger(process.env.PDF_QUEUE_TIMEOUT_MS) ?? 30_000

let activeCount = 0
const queue: QueueEntry[] = []

function createAbortError() {
  const error = new Error("PDF generation cancelled.")
  error.name = "AbortError"
  return error
}

function removeFromQueue(entry: QueueEntry) {
  const index = queue.indexOf(entry)
  if (index >= 0) {
    queue.splice(index, 1)
  }
}

function logState(step: string, options: AcquireOptions) {
  logInfo("report-pdf.queue", {
    step,
    label: options.label,
    reportId: options.reportId ?? null,
    activeCount,
    queuedCount: queue.length,
    maxConcurrency: MAX_CONCURRENCY,
  })
}

function releaseSlot() {
  activeCount = Math.max(0, activeCount - 1)
  logState("released", { label: "pdf" })
  void dispatchNext()
}

async function dispatchNext() {
  while (activeCount < MAX_CONCURRENCY && queue.length > 0) {
    const next = queue.shift()

    if (!next || next.acquired) {
      continue
    }

    if (next.options.signal?.aborted) {
      next.acquired = true
      clearTimeout(next.timeoutId)
      next.reject(createAbortError())
      continue
    }

    next.acquired = true
    clearTimeout(next.timeoutId)
    if (next.abortHandler && next.options.signal) {
      next.options.signal.removeEventListener("abort", next.abortHandler)
    }

    activeCount += 1
    logState("acquired", next.options)
    next.resolve(() => {
      releaseSlot()
    })
  }
}

export async function acquirePdfGenerationSlot(
  options: AcquireOptions
): Promise<ReleaseFn> {
  if (options.signal?.aborted) {
    throw createAbortError()
  }

  if (activeCount < MAX_CONCURRENCY && queue.length === 0) {
    activeCount += 1
    logState("acquired", options)
    return () => {
      releaseSlot()
    }
  }

  return await new Promise<ReleaseFn>((resolve, reject) => {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const entry: QueueEntry = {
      resolve,
      reject,
      acquired: false,
      options,
      timeoutId: setTimeout(() => {
        if (entry.acquired) {
          return
        }

        removeFromQueue(entry)
        entry.acquired = true
        if (entry.abortHandler && entry.options.signal) {
          entry.options.signal.removeEventListener("abort", entry.abortHandler)
        }
        reject(new Error("PDF generation queue timeout."))
      }, timeoutMs),
    }

    if (options.signal) {
      entry.abortHandler = () => {
        if (entry.acquired) {
          return
        }

        removeFromQueue(entry)
        entry.acquired = true
        clearTimeout(entry.timeoutId)
        reject(createAbortError())
      }

      options.signal.addEventListener("abort", entry.abortHandler, {
        once: true,
      })
    }

    queue.push(entry)
    logState("queued", options)
    void dispatchNext()
  })
}

export async function withPdfGenerationSlot<T>(
  options: AcquireOptions,
  task: () => Promise<T> | T
) {
  const release = await acquirePdfGenerationSlot(options)

  try {
    return await task()
  } finally {
    release()
  }
}
