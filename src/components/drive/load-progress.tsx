"use client"

/**
 * 下载进度（owner 2026-09-26「在load 文件的时候，是否可以添加一个进度条，和一个大概的时间」）：
 * 边收边算 —— 已收 / 总大小（服务器回了 content-length 才有百分比）· 速度 · 剩余时间。
 * 资料库原件、「我的文件」、存储总库打开文件都用这一份。
 */
export interface Progress {
  got: number
  total: number
  bps: number
}

/** 流式取回一个文件，每 150ms 报一次进度；失败抛出 errorText(状态码) 给的中文 */
export async function fetchWithProgress(
  url: string,
  signal: AbortSignal | undefined,
  onProgress: (p: Progress) => void,
  errorText: (status: number) => string = (s) => `文件读取失败（${s}）`,
): Promise<Blob> {
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error(errorText(r.status))
  const type = r.headers.get("content-type") ?? "application/octet-stream"
  const total = Number(r.headers.get("content-length")) || 0
  if (!r.body) return r.blob()
  const reader = r.body.getReader()
  const parts: Uint8Array[] = []
  let got = 0
  const t0 = performance.now()
  let lastShow = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    parts.push(value)
    got += value.length
    const now = performance.now()
    if (now - lastShow > 150) {
      lastShow = now
      onProgress({ got, total, bps: got / Math.max(0.2, (now - t0) / 1000) })
    }
  }
  return new Blob(parts as BlobPart[], { type })
}

const mb = (n: number) => (n / 1048576).toFixed(n < 10 * 1048576 ? 1 : 0)

/** 下载进度条：有总大小给百分比与剩余时间；没有就只报已收多少与速度（不假装知道还剩多久） */
export function LoadProgress({ got, total, bps, label = "正在取原件…" }: Progress & { label?: string }) {
  const pct = total ? Math.min(100, (got / total) * 100) : 0
  const left = total && bps > 0 ? Math.max(0, (total - got) / bps) : null
  const eta = left === null ? null : left < 1 ? "马上就好" : left < 60 ? `约 ${Math.ceil(left)} 秒` : `约 ${Math.ceil(left / 60)} 分钟`
  return (
    <div data-load-progress className="mx-auto flex max-w-sm flex-col gap-2 px-6 py-16 text-sm text-muted-foreground">
      <p className="text-foreground">{label}</p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={total ? Math.round(pct) : undefined}
        aria-label="下载进度"
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        {total ? (
          <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${pct}%` }} />
        ) : (
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/60" />
        )}
      </div>
      <p className="flex justify-between text-xs tabular-nums">
        <span>
          {mb(got)}
          {total ? ` / ${mb(total)}` : ""} MB{total ? ` · ${Math.round(pct)}%` : ""}
        </span>
        <span>
          {bps > 0 && `${mb(bps)} MB/s`}
          {eta && ` · ${eta}`}
        </span>
      </p>
    </div>
  )
}
