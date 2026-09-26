"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MinusIcon, MoveHorizontalIcon, PlusIcon, SearchIcon } from "lucide-react"
import type { PDFDocumentProxy } from "pdfjs-dist"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useAnnotator } from "../annotate/annotator"
import type { ViewerProps } from "./types"

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]
/** 放大镜：镜片直径（CSS 像素）与倍数（相对当前显示）。owner 2026-09-26「增加放大镜图标，局部放大就可以一下子就放大了」 */
const LENS = 240
const LENS_X = 2.5

/**
 * PDF：用 PDF.js 在浏览器里渲染。
 * - 按需渲染：页面滚动到附近才画，几百页的规范也不会卡
 * - 中文 PDF 需要字符映射表（cmaps），已随应用一起提供
 * - 高清屏按设备像素比渲染，文字不会发虚
 */
export function PdfViewer({ name, blob, fileId, banner, readOnly, focusIssue }: ViewerProps & { banner?: React.ReactNode }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState<string | null>(null)
  // 缩放：默认「适应宽度」（owner 2026-09-26「源文件在读取的时候要注意页面宽度。不能只显示局部」）；
  // 点 +/- 以后变成固定档位，点「适应宽度」回去
  const [zoom, setZoom] = useState<number | "fit">("fit")
  const [fitScale, setFitScale] = useState(1)
  const [page, setPage] = useState(1)
  const [loupe, setLoupe] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scale = zoom === "fit" ? fitScale : ZOOMS[zoom]
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

  // 适应宽度：第 1 页在 100% 时的宽度 vs 滚动区可用宽度（左右各留 24px）；容器变宽变窄（拖抽屉）时跟着算
  useEffect(() => {
    const root = scrollRef.current
    if (!doc || !root) return
    let w1 = 0
    let alive = true
    const fit = () => {
      if (!w1 || !alive) return
      // 左右 padding 各 24px，再留 4px 余量；向下取整 —— 四舍五入会多出 1–2px 横向滚动条（2026-09-26 实测）
      const next = Math.max(0.25, Math.min(4, Math.floor(((root.clientWidth - 52) / w1) * 100) / 100))
      setFitScale((old) => (Math.abs(old - next) < 0.005 ? old : next))
    }
    doc.getPage(1).then((pg) => {
      w1 = pg.getViewport({ scale: 1 }).width
      fit()
    })
    const ro = new ResizeObserver(fit)
    ro.observe(root)
    return () => {
      alive = false
      ro.disconnect()
    }
  }, [doc])

  // 从当前比例往上 / 往下跳到最近的一档
  const step = (dir: 1 | -1) => {
    const i = dir > 0 ? ZOOMS.findIndex((z) => z > scale + 0.001) : ZOOMS.findLastIndex((z) => z < scale - 0.001)
    if (i >= 0) setZoom(i)
  }

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
  }, [doc, scale])

  if (error) return <p className="p-8 text-center text-sm text-destructive">{error}</p>
  if (!doc)
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="mx-auto aspect-[210/297] w-full max-w-2xl" />
      </div>
    )

  return (
    // @container：工具栏的文字标签按查看器自己的宽度显示（放进右侧抽屉时窗口宽、查看器窄）
    <div className="@container flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b px-4 py-1.5">
        <Button variant="ghost" size="icon-sm" disabled={scale <= ZOOMS[0] + 0.001} onClick={() => step(-1)} aria-label="缩小">
          <MinusIcon />
        </Button>
        <span className="w-12 text-center text-xs text-muted-foreground tabular-nums">{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="icon-sm" disabled={scale >= ZOOMS[ZOOMS.length - 1] - 0.001} onClick={() => step(1)} aria-label="放大">
          <PlusIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-pressed={zoom === "fit"}
          className={cn(zoom === "fit" && "bg-accent text-foreground")}
          onClick={() => setZoom("fit")}
          aria-label="适应宽度"
          title="适应宽度：整页宽度放进窗口"
        >
          <MoveHorizontalIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-pressed={loupe}
          data-loupe-toggle
          className={cn(loupe && "bg-accent text-foreground")}
          onClick={() => setLoupe((v) => !v)}
          aria-label={loupe ? "关闭放大镜" : "放大镜"}
          title={`放大镜：鼠标指到哪里，就把那一块放大 ${LENS_X} 倍`}
        >
          <SearchIcon />
        </Button>
        <span className="mx-2 h-4 w-px bg-border" aria-hidden />
        {annot.toolbar}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          <span className="whitespace-nowrap">第 {page} / {doc.numPages} 页</span>
        </span>
      </div>
      {banner}
      <div className="flex min-h-0 flex-1">
        <div ref={scrollRef} className={cn("relative min-w-0 flex-1 overflow-auto bg-surface-sunken", loupe && "cursor-zoom-in")}>
          <div className="flex w-max min-w-full flex-col items-center gap-4 p-6">
            {Array.from({ length: doc.numPages }, (_, i) => (
              <PdfPage key={`${i}-${scale}`} doc={doc} n={i + 1} scale={scale} root={scrollRef} overlay={annot.layer} />
            ))}
          </div>
          {loupe && <Loupe doc={doc} scale={scale} root={scrollRef} />}
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
  root,
  overlay,
}: {
  doc: PDFDocumentProxy
  n: number
  scale: number
  root: React.RefObject<HTMLDivElement | null>
  /** 叠加层（标注）：参数是页码、页面宽高（100% 时的点）、当前缩放 */
  overlay?: (page: number, w: number, h: number, displayScale: number) => React.ReactNode
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    let task: { cancel: () => void } | null = null
    let io: IntersectionObserver | null = null
    doc.getPage(n).then((pg) => {
      if (cancelled) return
      const vp = pg.getViewport({ scale })
      setSize({ w: vp.width, h: vp.height })
      // 进入视口附近才渲染
      io = new IntersectionObserver(
        ([e]) => {
          if (!e.isIntersecting || !canvasRef.current) return
          io?.disconnect()
          const dpr = window.devicePixelRatio || 1
          const hi = pg.getViewport({ scale: scale * dpr })
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
  }, [doc, n, scale, root])

  return (
    <div
      ref={wrapRef}
      data-page={n}
      className="relative bg-paper shadow-float ring-1 ring-ink/5"
      style={size ? { width: size.w, height: size.h } : { width: 595 * scale, height: 842 * scale }}
    >
      <canvas ref={canvasRef} aria-label={`第 ${n} 页`} className="h-full w-full" />
      {size && overlay?.(n, size.w / scale, size.h / scale, scale)}
    </div>
  )
}

/**
 * 放大镜：鼠标在页面上移动时，镜片（圆形，LENS 像素）跟着指针，显示指针下那一块放大 LENS_X 倍的样子。
 * 镜片单独按「当前比例 × LENS_X × 设备像素比」渲染那一页（缓存到换页或换比例），放大后文字不糊；
 * 太大的页面限制在 6000 像素宽，避免一页吃掉几百 MB 内存。镜片不拦鼠标（pointer-events: none），不影响滚动与标注。
 */
function Loupe({ doc, scale, root }: { doc: PDFDocumentProxy; scale: number; root: React.RefObject<HTMLDivElement | null> }) {
  const lensRef = useRef<HTMLCanvasElement>(null)
  const [at, setAt] = useState<{ x: number; y: number; n: number; fx: number; fy: number } | null>(null)
  const cache = useRef<{ key: string; canvas: HTMLCanvasElement; k: number } | null>(null)
  const pending = useRef<string | null>(null)

  const draw = useCallback(() => {
    const lens = lensRef.current
    const c = cache.current
    if (!lens || !at || !c || c.key !== `${at.n}@${scale}`) return
    const dpr = window.devicePixelRatio || 1
    lens.width = LENS * dpr
    lens.height = LENS * dpr
    const g = lens.getContext("2d")!
    g.fillStyle = "#fff"
    g.fillRect(0, 0, lens.width, lens.height)
    // 镜片中心 = 指针在页面上的位置（fx, fy 是 0–1 的相对坐标）；取源图中以它为中心、边长 LENS/LENS_X（显示像素）的那一块
    // c.k = 高清页面每个显示像素对应多少源像素；镜片里看到的是 LENS/LENS_X 个显示像素见方的那一块
    //（2026-09-26 第一版把 c.k 写反成了「整页源像素宽 / c.k」，取了一块比整页还大几十倍的区域 ⇒ 镜片一片白只剩一个点）
    const src = (LENS / LENS_X) * c.k
    const cx = at.fx * c.canvas.width
    const cy = at.fy * c.canvas.height
    g.drawImage(c.canvas, cx - src / 2, cy - src / 2, src, src, 0, 0, lens.width, lens.height)
  }, [at, scale])

  useEffect(() => {
    const el = root.current
    if (!el) return
    const move = (e: MouseEvent) => {
      const pageEl = (e.target as HTMLElement).closest<HTMLElement>("[data-page]")
      if (!pageEl) return setAt(null)
      const r = pageEl.getBoundingClientRect()
      const box = el.getBoundingClientRect()
      setAt({
        x: e.clientX - box.left + el.scrollLeft,
        y: e.clientY - box.top + el.scrollTop,
        n: Number(pageEl.dataset.page),
        fx: (e.clientX - r.left) / r.width,
        fy: (e.clientY - r.top) / r.height,
      })
    }
    const leave = () => setAt(null)
    el.addEventListener("mousemove", move)
    el.addEventListener("mouseleave", leave)
    return () => {
      el.removeEventListener("mousemove", move)
      el.removeEventListener("mouseleave", leave)
    }
  }, [root])

  // 换页或换比例时，把这一页按放大倍数渲染一份
  useEffect(() => {
    if (!at) return
    const key = `${at.n}@${scale}`
    if (cache.current?.key === key || pending.current === key) return
    pending.current = key
    doc.getPage(at.n).then(async (pg) => {
      const dpr = window.devicePixelRatio || 1
      const base = pg.getViewport({ scale: 1 })
      const k = Math.min(scale * LENS_X * dpr, 6000 / base.width)
      const vp = pg.getViewport({ scale: k })
      const canvas = document.createElement("canvas")
      canvas.width = vp.width
      canvas.height = vp.height
      await pg.render({ canvas, viewport: vp }).promise
      // k 换算成「每个显示像素对应多少源像素」：canvas 宽 / 页面显示宽
      cache.current = { key, canvas, k: canvas.width / (base.width * scale) }
      pending.current = null
      draw()
    }).catch(() => {
      pending.current = null // 取页或渲染失败：复位，下次移动再试（不让这一页从此画不出来）
    })
  }, [at, doc, scale, draw])

  useEffect(draw, [draw])

  if (!at) return null
  return (
    <canvas
      ref={lensRef}
      data-loupe
      aria-hidden
      className="pointer-events-none absolute z-20 rounded-full border-2 border-background shadow-float ring-1 ring-ink/20"
      style={{ width: LENS, height: LENS, left: at.x - LENS / 2, top: at.y - LENS / 2 }}
    />
  )
}
