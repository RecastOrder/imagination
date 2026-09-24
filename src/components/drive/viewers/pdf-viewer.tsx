"use client"

import { useEffect, useRef, useState } from "react"
import { MinusIcon, PlusIcon } from "lucide-react"
import type { PDFDocumentProxy } from "pdfjs-dist"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAnnotator } from "../annotate/annotator"
import type { ViewerProps } from "./types"

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2]

/**
 * PDF：用 PDF.js 在浏览器里渲染。
 * - 按需渲染：页面滚动到附近才画，几百页的规范也不会卡
 * - 中文 PDF 需要字符映射表（cmaps），已随应用一起提供
 * - 高清屏按设备像素比渲染，文字不会发虚
 */
export function PdfViewer({ name, blob, fileId, banner, readOnly }: ViewerProps & { banner?: React.ReactNode }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(2)
  const [page, setPage] = useState(1)
  const scrollRef = useRef<HTMLDivElement>(null)
  // 标注与测量：页面单位是 PDF 的“点”（100% 缩放时的尺寸）
  const annot = useAnnotator({
    fileId,
    fileName: name,
    unit: "pt",
    readOnly,
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
  }, [doc, zoom])

  if (error) return <p className="p-8 text-center text-sm text-destructive">{error}</p>
  if (!doc)
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="mx-auto aspect-[210/297] w-full max-w-2xl" />
      </div>
    )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b px-4 py-1.5">
        <Button variant="ghost" size="icon-sm" disabled={zoom === 0} onClick={() => setZoom((z) => z - 1)} aria-label="缩小">
          <MinusIcon />
        </Button>
        <span className="w-12 text-center text-xs text-muted-foreground tabular-nums">{Math.round(ZOOMS[zoom] * 100)}%</span>
        <Button variant="ghost" size="icon-sm" disabled={zoom === ZOOMS.length - 1} onClick={() => setZoom((z) => z + 1)} aria-label="放大">
          <PlusIcon />
        </Button>
        <span className="mx-2 h-4 w-px bg-border" aria-hidden />
        {annot.toolbar}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          第 {page} / {doc.numPages} 页
        </span>
      </div>
      {banner}
      <div className="flex min-h-0 flex-1">
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-auto bg-surface-sunken">
          <div className="flex w-max min-w-full flex-col items-center gap-4 p-6">
            {Array.from({ length: doc.numPages }, (_, i) => (
              <PdfPage key={`${i}-${zoom}`} doc={doc} n={i + 1} scale={ZOOMS[zoom]} root={scrollRef} overlay={annot.layer} />
            ))}
          </div>
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
