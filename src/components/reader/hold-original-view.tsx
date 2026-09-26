"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import type { Source } from "@/lib/sources/types"

// PDF.js 体积大：按需加载（项目约定）
const PdfViewer = dynamic(() => import("@/components/drive/viewers/pdf-viewer").then((m) => m.PdfViewer), {
  ssr: false,
  loading: () => <Skeleton className="mx-auto h-[70vh] w-full max-w-3xl" />,
})

/**
 * 原版视图（hold 上的规范 / 图集）：取回原件 PDF，交给文件浏览里同一个 PDF.js 查看器渲染。
 * 只读：资料库的原件不能在这里批注成「问题」，只能看、量。
 */
/** className：容器高度。阅读页默认占满视口；右侧抽屉里传 h-full 跟着抽屉走 */
export function HoldOriginalView({ source, className = "h-[calc(100dvh-8rem)]" }: { source: Source; className?: string }) {
  const [state, setState] = useState<{ blob?: Blob; error?: string }>({})
  // 下载进度（owner 2026-09-26「在load 文件的时候，是否可以添加一个进度条，和一个大概的时间」）：
  // 边收边算 —— 已收 / 总大小（hold 回了 content-length 才有百分比）· 速度（最近几秒的平均）· 剩余时间
  const [prog, setProg] = useState<{ got: number; total: number; bps: number }>({ got: 0, total: 0, bps: 0 })
  useEffect(() => {
    let alive = true
    const ctl = new AbortController()
    ;(async () => {
      try {
        const r = await fetch(`/api/sources/${encodeURIComponent(source.id)}/file`, { signal: ctl.signal })
        if (!r.ok) throw new Error(r.status === 404 ? "这份资料的原件没有找到" : `原件取不到（${r.status}）`)
        const total = Number(r.headers.get("content-length")) || 0
        if (!r.body) {
          const blob = await r.blob()
          if (alive) setState({ blob })
          return
        }
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
          if (now - lastShow > 150 && alive) {
            lastShow = now
            setProg({ got, total, bps: got / Math.max(0.2, (now - t0) / 1000) })
          }
        }
        if (alive) setState({ blob: new Blob(parts as BlobPart[], { type: r.headers.get("content-type") ?? "application/pdf" }) })
      } catch (e) {
        if (alive && (e as Error).name !== "AbortError") setState({ error: (e as Error).message })
      }
    })()
    return () => {
      alive = false
      ctl.abort()
    }
  }, [source.id])

  if (state.error) return <p className="py-16 text-center text-sm text-muted-foreground">{state.error}</p>
  if (!state.blob) return <LoadProgress {...prog} />
  return (
    <div data-hold-original className={className}>
      <PdfViewer name={`${source.code ?? source.title}.pdf`} blob={state.blob} src="" fileId={`library:${source.id}`} readOnly />
    </div>
  )
}

const mb = (n: number) => (n / 1048576).toFixed(n < 10 * 1048576 ? 1 : 0)

/** 下载进度条：有总大小给百分比与剩余时间；没有就只报已收多少与速度（不假装知道还剩多久） */
function LoadProgress({ got, total, bps }: { got: number; total: number; bps: number }) {
  const pct = total ? Math.min(100, (got / total) * 100) : 0
  const left = total && bps > 0 ? Math.max(0, (total - got) / bps) : null
  const eta = left === null ? null : left < 1 ? "马上就好" : left < 60 ? `约 ${Math.ceil(left)} 秒` : `约 ${Math.ceil(left / 60)} 分钟`
  return (
    <div data-load-progress className="mx-auto flex max-w-sm flex-col gap-2 px-6 py-16 text-sm text-muted-foreground">
      <p className="text-foreground">正在取原件…</p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={total ? Math.round(pct) : undefined}
        aria-label="原件下载进度"
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
