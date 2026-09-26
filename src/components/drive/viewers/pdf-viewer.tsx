"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { MinusIcon, MoveHorizontalIcon, PlusIcon, ZoomInIcon } from "lucide-react"
import type { PDFDocumentProxy } from "pdfjs-dist"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useAnnotator } from "../annotate/annotator"
import type { ViewerProps } from "./types"

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8]
/** 画布像素上限：放大到 8 倍时一张 A1 图纸按原比例渲染要几亿像素，浏览器会崩；超过就降清晰度，显示尺寸不变 */
const MAX_CANVAS_W = 8192
const MAX_CANVAS_PX = 40e6
/** 适应宽度时左右留白（滚动区 padding 各 24px，再留 4px 余量，避免 1–2px 横向滚动条） */
const PAD = 52

/**
 * PDF：用 PDF.js 在浏览器里渲染。
 * - 按需渲染：页面滚动到附近才画，几百页的规范也不会卡
 * - 中文 PDF 需要字符映射表（cmaps），已随应用一起提供
 * - 高清屏按设备像素比渲染，文字不会发虚
 */
export function PdfViewer({ name, blob, fileId, banner, readOnly, focusIssue }: ViewerProps & { banner?: React.ReactNode }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState<string | null>(null)
  // 缩放两种状态：
  // - fit：**每一页各自**按查看区宽度缩放（owner 2026-09-26「如果出现了不同的页面大小的情况下，要自动调节…统一按照宽度展示」）——
  //   原来整份文档按第 1 页算一个比例，遇到夹在 A4 里的 A3 大图那一页就只显示局部
  // - fixed：统一比例（± 跳档、框选放大之后）
  const [view, setView] = useState<{ mode: "fit" } | { mode: "fixed"; scale: number }>({ mode: "fit" })
  const [fitW, setFitW] = useState(0)
  const [page, setPage] = useState(1)
  const [boxZoom, setBoxZoom] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  // 每页 100% 时的尺寸（点），页面加载时各自报上来；框选放大、占位尺寸、显示百分比都用它
  const [sizes, setSizes] = useState<Record<number, { w: number; h: number }>>({})
  const sizeQueue = useRef<Record<number, { w: number; h: number }>>({})
  const sizeFlush = useRef(0)
  const pendingScroll = useRef<{ n: number; fx: number; fy: number } | null>(null)
  // 标注与测量：页面单位是 PDF 的“点”（100% 缩放时的尺寸）
  const annot = useAnnotator({
    fileId,
    fileName: name,
    unit: "pt",
    readOnly,
    focusIssue,
    onJump: (m) => scrollRef.current?.querySelector(`[data-page="${m.page}"]`)?.scrollIntoView({ block: "center" }),
  })

  useEffect(() => {
    let alive = true
    // 加载任务：离开页面或换文件时销毁，释放后台解析线程
    let task: { destroy: () => Promise<void> } | null = null
    ;(async () => {
      try {
        // 用兼容版（legacy）：自带新语法的补丁，旧一些的浏览器也能打开
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
        pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs"
        const t = pdfjs.getDocument({
          data: new Uint8Array(await blob.arrayBuffer()),
          cMapUrl: "/vendor/pdfjs/cmaps/",
          cMapPacked: true,
          standardFontDataUrl: "/vendor/pdfjs/standard_fonts/",
        })
        task = t
        if (!alive) return t.destroy()
        const d = await t.promise
        if (alive) setDoc(d)
      } catch {
        if (alive) setError("这个 PDF 无法打开，可能已损坏或被加密")
      }
    })()
    return () => {
      alive = false
      task?.destroy()
    }
  }, [blob])

  // 查看区可用宽度：容器变宽变窄（拖抽屉、改窗口）时跟着变；每页的适应比例 = 可用宽度 / 该页宽度
  useEffect(() => {
    const root = scrollRef.current
    if (!doc || !root) return
    const measure = () => setFitW((old) => {
      const next = Math.max(120, root.clientWidth - PAD)
      return Math.abs(old - next) < 2 ? old : next
    })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    return () => ro.disconnect()
  }, [doc])

  // 各页尺寸陆续报上来：攒到下一帧一起写，几百页的规范不会逐页触发重排
  const onSize = (n: number, w: number, h: number) => {
    sizeQueue.current[n] = { w, h }
    if (!sizeFlush.current)
      sizeFlush.current = requestAnimationFrame(() => {
        sizeFlush.current = 0
        const q = sizeQueue.current
        sizeQueue.current = {}
        setSizes((old) => ({ ...old, ...q }))
      })
  }
  const scaleOf = (n: number) => {
    if (view.mode === "fixed") return view.scale
    const w = sizes[n]?.w ?? sizes[1]?.w ?? 595
    return fitW ? Math.floor((fitW / w) * 1000) / 1000 : 1
  }
  const shown = scaleOf(page) // 工具栏显示的是当前页的比例

  // 从当前比例往上 / 往下跳到最近的一档（之后统一比例）
  const step = (dir: 1 | -1) => {
    const z = dir > 0 ? ZOOMS.find((v) => v > shown + 0.001) : ZOOMS.findLast((v) => v < shown - 0.001)
    if (z) setView({ mode: "fixed", scale: z })
  }

  // 框选放大之后：新比例的页面排好了，把框的左上角滚到视野左上
  useLayoutEffect(() => {
    const p = pendingScroll.current
    const root = scrollRef.current
    if (!p || !root) return
    const el = root.querySelector<HTMLElement>(`[data-page="${p.n}"]`)
    if (!el) return
    pendingScroll.current = null
    root.scrollLeft = el.offsetLeft + p.fx * el.offsetWidth - 24
    root.scrollTop = el.offsetTop + p.fy * el.offsetHeight - 24
  }, [view])

  // 当前页码：看哪一页的顶部在视口上半部分
  useEffect(() => {
    const root = scrollRef.current
    if (!doc || !root) return
    const io = new IntersectionObserver(
      (es) => {
        const top = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (top) setPage(Number((top.target as HTMLElement).dataset.page))
      },
      { root, rootMargin: "0px 0px -60% 0px" },
    )
    root.querySelectorAll("[data-page]").forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [doc, view, fitW])

  if (error) return <p className="p-8 text-center text-sm text-destructive">{error}</p>
  if (!doc)
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="mx-auto aspect-[210/297] w-full max-w-2xl" />
      </div>
    )

  const viewKey = view.mode === "fit" ? `f${fitW}` : `s${view.scale}`
  return (
    // @container：工具栏的文字标签按查看器自己的宽度显示（放进右侧抽屉时窗口宽、查看器窄）
    <div className="@container flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b px-4 py-1.5">
        <Button variant="ghost" size="icon-sm" disabled={shown <= ZOOMS[0] + 0.001} onClick={() => step(-1)} aria-label="缩小">
          <MinusIcon />
        </Button>
        <span className="w-12 text-center text-xs text-muted-foreground tabular-nums">{Math.round(shown * 100)}%</span>
        <Button variant="ghost" size="icon-sm" disabled={shown >= ZOOMS[ZOOMS.length - 1] - 0.001} onClick={() => step(1)} aria-label="放大">
          <PlusIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-pressed={view.mode === "fit"}
          className={cn(view.mode === "fit" && "bg-accent text-foreground")}
          onClick={() => setView({ mode: "fit" })}
          aria-label="适应宽度"
          title="适应宽度：每一页都按窗口宽度整页显示"
        >
          <MoveHorizontalIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-pressed={boxZoom}
          data-boxzoom-toggle
          className={cn(boxZoom && "bg-accent text-foreground")}
          onClick={() => setBoxZoom((v) => !v)}
          aria-label={boxZoom ? "取消框选放大" : "框选放大"}
          title="框选放大：在页面上拖一个框，松手就把框里的内容放大到填满窗口（按 ↔ 回到整页）"
        >
          <ZoomInIcon />
        </Button>
        <span className="mx-2 h-4 w-px bg-border" aria-hidden />
        {annot.toolbar}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          <span className="whitespace-nowrap">第 {page} / {doc.numPages} 页</span>
        </span>
      </div>
      {banner}
      <div className="flex min-h-0 flex-1">
        <div ref={scrollRef} className={cn("relative min-w-0 flex-1 overflow-auto bg-surface-sunken", boxZoom && "cursor-crosshair select-none")}>
          <div className="flex w-max min-w-full flex-col items-center gap-4 p-6">
            {Array.from({ length: doc.numPages }, (_, i) => (
              <PdfPage
                key={`${i}-${viewKey}`}
                doc={doc}
                n={i + 1}
                scale={view.mode === "fixed" ? view.scale : undefined}
                fitWidth={view.mode === "fit" ? fitW : undefined}
                guess={sizes[i + 1] ?? sizes[1]}
                onSize={onSize}
                root={scrollRef}
                overlay={annot.layer}
              />
            ))}
          </div>
          {boxZoom && (
            <BoxZoom
              root={scrollRef}
              onZoom={(n, fx, fy, fw) => {
                const w = sizes[n]?.w ?? 595
                const s = Math.max(ZOOMS[0], Math.min(ZOOMS[ZOOMS.length - 1], Math.floor(((fitW || 600) / (fw * w)) * 1000) / 1000))
                pendingScroll.current = { n, fx, fy }
                setView({ mode: "fixed", scale: s })
                setBoxZoom(false) // 一次框选放大一次；要再放大就再点一次
              }}
            />
          )}
        </div>
        {annot.panel}
      </div>
      {annot.dialog}
    </div>
  )
}

function PdfPage({
  doc,
  n,
  scale,
  fitWidth,
  guess,
  onSize,
  root,
  overlay,
}: {
  doc: PDFDocumentProxy
  n: number
  /** 统一比例；与 fitWidth 二选一 */
  scale?: number
  /** 适应宽度：这一页按这个宽度（CSS 像素）缩放 */
  fitWidth?: number
  /** 尺寸还没取到时的占位（点）：用已知的这一页或第 1 页 */
  guess?: { w: number; h: number }
  onSize: (n: number, w: number, h: number) => void
  root: React.RefObject<HTMLDivElement | null>
  /** 叠加层（标注）：参数是页码、页面宽高（100% 时的点）、当前缩放 */
  overlay?: (page: number, w: number, h: number, displayScale: number) => React.ReactNode
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [base, setBase] = useState<{ w: number; h: number } | null>(null)
  const eff = (b: { w: number; h: number }) => (fitWidth ? Math.floor((fitWidth / b.w) * 1000) / 1000 : (scale ?? 1))

  useEffect(() => {
    let cancelled = false
    let task: { cancel: () => void } | null = null
    let io: IntersectionObserver | null = null
    doc.getPage(n).then((pg) => {
      if (cancelled) return
      const vp1 = pg.getViewport({ scale: 1 })
      const b = { w: vp1.width, h: vp1.height }
      setBase(b)
      onSize(n, b.w, b.h)
      const s = eff(b)
      // 进入视口附近才渲染
      io = new IntersectionObserver(
        ([e]) => {
          if (!e.isIntersecting || !canvasRef.current) return
          io?.disconnect()
          const dpr = window.devicePixelRatio || 1
          // 清晰度封顶：放大很多倍时不按原比例渲染整页（会崩），显示尺寸不变、只是略糊
          const r = Math.min(s * dpr, MAX_CANVAS_W / b.w, Math.sqrt(MAX_CANVAS_PX / (b.w * b.h)))
          const hi = pg.getViewport({ scale: r })
          const canvas = canvasRef.current
          canvas.width = hi.width
          canvas.height = hi.height
          task = pg.render({ canvas, viewport: hi })
        },
        { root: root.current, rootMargin: "600px 0px" },
      )
      if (wrapRef.current) io.observe(wrapRef.current)
    })
    return () => {
      cancelled = true
      io?.disconnect()
      task?.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 比例变化时父组件换 key 重建本页
  }, [doc, n, root])

  const b = base ?? guess ?? { w: 595, h: 842 }
  const s = eff(b)
  return (
    <div ref={wrapRef} data-page={n} className="relative bg-paper shadow-float ring-1 ring-ink/5" style={{ width: b.w * s, height: b.h * s }}>
      <canvas ref={canvasRef} aria-label={`第 ${n} 页`} className="h-full w-full" />
      {base && overlay?.(n, base.w, base.h, s)}
    </div>
  )
}

/**
 * 框选放大（owner 2026-09-26「放大镜的目的是为了局部放大，点击放大镜的时候可以局部框选并放大局部信息」）：
 * 在某一页上按下拖出一个框，松手时回报「第几页 · 框左上角在页内的相对位置 · 框宽占页宽的比例」，由查看器换算新比例并滚过去。
 * 框太小（< 8px）当成误点，不放大。拖出页外按那一页的边界截住。
 */
function BoxZoom({ root, onZoom }: { root: React.RefObject<HTMLDivElement | null>; onZoom: (n: number, fx: number, fy: number, fw: number) => void }) {
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  // 回调放进 ref：父组件重排（比如当前页码变了）时不重新挂监听，拖到一半的框不会丢
  const cb = useRef(onZoom)
  useEffect(() => {
    cb.current = onZoom
  }, [onZoom])
  useEffect(() => {
    const el = root.current
    if (!el) return
    let start: { pageEl: HTMLElement; x: number; y: number } | null = null
    const local = (e: MouseEvent) => {
      const box = el.getBoundingClientRect()
      return { x: e.clientX - box.left + el.scrollLeft, y: e.clientY - box.top + el.scrollTop }
    }
    const down = (e: MouseEvent) => {
      const pageEl = (e.target as HTMLElement).closest<HTMLElement>("[data-page]")
      if (!pageEl || e.button !== 0) return
      e.preventDefault()
      start = { pageEl, ...local(e) }
      setRect({ x: start.x, y: start.y, w: 0, h: 0 })
    }
    const move = (e: MouseEvent) => {
      if (!start) return
      const p = local(e)
      setRect({ x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) })
    }
    const up = (e: MouseEvent) => {
      if (!start) return
      const s = start
      start = null
      setRect(null)
      const pr = s.pageEl.getBoundingClientRect()
      const box = el.getBoundingClientRect()
      const x0 = Math.max(pr.left, Math.min(e.clientX, s.x - el.scrollLeft + box.left))
      const x1 = Math.min(pr.right, Math.max(e.clientX, s.x - el.scrollLeft + box.left))
      const y0 = Math.max(pr.top, Math.min(e.clientY, s.y - el.scrollTop + box.top))
      const y1 = Math.min(pr.bottom, Math.max(e.clientY, s.y - el.scrollTop + box.top))
      if (x1 - x0 < 8 || y1 - y0 < 8) return
      cb.current(Number(s.pageEl.dataset.page), (x0 - pr.left) / pr.width, (y0 - pr.top) / pr.height, (x1 - x0) / pr.width)
    }
    el.addEventListener("mousedown", down)
    window.addEventListener("mousemove", move)
    window.addEventListener("mouseup", up)
    return () => {
      el.removeEventListener("mousedown", down)
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mouseup", up)
    }
  }, [root])
  if (!rect) return null
  return (
    <div
      data-boxzoom-rect
      aria-hidden
      className="pointer-events-none absolute z-20 border-2 border-primary bg-primary/10"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    />
  )
}
