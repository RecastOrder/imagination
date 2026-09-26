"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ListTreeIcon,
  MinusIcon,
  MoveHorizontalIcon,
  PlusIcon,
  RotateCwIcon,
  ScanIcon,
  SearchIcon,
  TextCursorIcon,
  XIcon,
  ZoomInIcon,
} from "lucide-react"
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useAnnotator } from "../annotate/annotator"
import type { ViewerProps } from "./types"
import "./pdf-text-layer.css"

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8]
/** 画布像素上限：放大到 8 倍时一张 A1 图纸按原比例渲染要几亿像素，浏览器会崩；超过就降清晰度，显示尺寸不变 */
const MAX_CANVAS_W = 8192
const MAX_CANVAS_PX = 40e6
/** 适应宽度/整页时四周留白（滚动区 padding 各 24px，再留 4px 余量，避免 1–2px 滚动条） */
const PAD = 52

type View = { mode: "fit" } | { mode: "page" } | { mode: "fixed"; scale: number }
type Size = { w: number; h: number }
type OutlineItem = { title: string; page: number | null; items: OutlineItem[] }

/**
 * PDF：用 PDF.js 在浏览器里渲染。阅读功能对照 pdf.js 官方阅读器 / Chrome / Acrobat 配齐
 * （owner 2026-09-26「是不是可以把pdf的阅读逻辑在这里配置完整，似乎好多东西都不完整」）：
 * - 缩放：适应宽度（默认，每页各自）· 适应整页 · ± 跳档 · Ctrl/⌘+滚轮（以指针为中心）· 框选放大 · 旋转
 * - 翻页：页码输入跳转 · 上/下一页 · PageUp/PageDown/Home/End · 记住上次读到的页
 * - 手形拖动页面（浏览工具）· 选文字模式（文字层，可复制）· Ctrl/⌘+F 在原件里查找（高亮、逐处跳）
 * - 目录：PDF 自带的书签；没有就明说没有
 * - 按需渲染：页面滚动到附近才画；中文 cmaps 随应用提供；高清屏按设备像素比渲染
 */
export function PdfViewer({ name, blob, fileId, banner, readOnly, focusIssue }: ViewerProps & { banner?: React.ReactNode }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>({ mode: "fit" })
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [rot, setRot] = useState(0)
  const [page, setPage] = useState(1)
  const [pageInput, setPageInput] = useState("")
  const [boxZoom, setBoxZoom] = useState(false)
  const [textMode, setTextMode] = useState(false)
  const [outline, setOutline] = useState<OutlineItem[] | null | undefined>(undefined)
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [find, setFind] = useState<{ open: boolean; q: string; hits: { n: number; c: number }[]; i: number; busy: boolean; withText: number }>({
    open: false, q: "", hits: [], i: 0, busy: false, withText: 0,
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  const findRef = useRef<HTMLInputElement>(null)
  // 每页 100% 时的尺寸（点，未旋转），页面加载时各自报上来；攒到下一帧一起写
  const [sizes, setSizes] = useState<Record<number, Size>>({})
  const sizeQueue = useRef<Record<number, Size>>({})
  const sizeFlush = useRef(0)
  const texts = useRef(new Map<number, string>())
  // 缩放之后要把某一点放回原处（框选放大：框左上角到视野左上；滚轮：指针下那一点不动）
  const anchor = useRef<{ n: number; fx: number; fy: number; ox: number; oy: number } | null>(null)
  const annot = useAnnotator({
    fileId,
    fileName: name,
    unit: "pt",
    readOnly,
    focusIssue,
    onJump: (m) => scrollRef.current?.querySelector(`[data-page="${m.page}"]`)?.scrollIntoView({ block: "center" }),
  })
  const hand = annot.api.tool === "browse" && !boxZoom && !textMode
  const memKey = `pdf-page:${fileId}`

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

  // 目录（PDF 自带书签）：把每一项的目的地解析成页码；没有书签 ⇒ null（面板里明说「这份 PDF 没有自带目录」）
  useEffect(() => {
    if (!doc) return
    let alive = true
    const pageOf = async (dest: unknown): Promise<number | null> => {
      try {
        const d = typeof dest === "string" ? await doc.getDestination(dest) : (dest as unknown[] | null)
        if (!d || !d[0]) return null
        return typeof d[0] === "number" ? d[0] + 1 : (await doc.getPageIndex(d[0] as Parameters<typeof doc.getPageIndex>[0])) + 1
      } catch {
        return null
      }
    }
    type Raw = { title: string; dest: unknown; items: Raw[] }
    const walk = async (xs: Raw[]): Promise<OutlineItem[]> =>
      Promise.all(xs.map(async (x) => ({ title: x.title, page: await pageOf(x.dest), items: await walk(x.items ?? []) })))
    doc
      .getOutline()
      .then(async (o) => {
        const tree = o && o.length ? await walk(o as unknown as Raw[]) : null
        if (alive) setOutline(tree)
      })
      .catch(() => alive && setOutline(null))
    return () => {
      alive = false
    }
  }, [doc])

  // 查看区可用宽高：容器变宽变窄（拖抽屉、改窗口）时跟着变
  useEffect(() => {
    const root = scrollRef.current
    if (!doc || !root) return
    const measure = () =>
      setBox((old) => {
        const w = Math.max(120, root.clientWidth - PAD)
        const h = Math.max(120, root.clientHeight - PAD)
        return Math.abs(old.w - w) < 2 && Math.abs(old.h - h) < 2 ? old : { w, h }
      })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    return () => ro.disconnect()
  }, [doc, outlineOpen])

  const onSize = useCallback((n: number, w: number, h: number) => {
    sizeQueue.current[n] = { w, h }
    if (!sizeFlush.current)
      sizeFlush.current = requestAnimationFrame(() => {
        sizeFlush.current = 0
        const q = sizeQueue.current
        sizeQueue.current = {}
        setSizes((old) => ({ ...old, ...q }))
      })
  }, [])

  const dims = (n: number): Size => {
    const b = sizes[n] ?? sizes[1] ?? { w: 595, h: 842 }
    return rot % 180 ? { w: b.h, h: b.w } : b
  }
  const scaleOf = (n: number) => {
    if (view.mode === "fixed") return view.scale
    if (!box.w) return 1
    const d = dims(n)
    const s = view.mode === "fit" ? box.w / d.w : Math.min(box.w / d.w, box.h / d.h)
    return Math.floor(s * 1000) / 1000
  }
  const shown = scaleOf(page)

  const zoomTo = (s: number, a?: { n: number; fx: number; fy: number; ox: number; oy: number }) => {
    const z = Math.max(ZOOMS[0], Math.min(ZOOMS[ZOOMS.length - 1], Math.floor(s * 1000) / 1000))
    if (a) anchor.current = a
    setView({ mode: "fixed", scale: z })
  }
  // ± 从当前页的比例往上 / 往下跳到最近的一档
  const step = (dir: 1 | -1) => {
    const z = dir > 0 ? ZOOMS.find((v) => v > shown + 0.001) : ZOOMS.findLast((v) => v < shown - 0.001)
    if (z) zoomTo(z, centerAnchor())
  }
  // 以视野中心为锚：缩放后还在看同一处
  const centerAnchor = () => {
    const root = scrollRef.current
    const el = root?.querySelector<HTMLElement>(`[data-page="${page}"]`)
    if (!root || !el) return undefined
    const ox = root.clientWidth / 2
    const oy = root.clientHeight / 2
    return { n: page, fx: (root.scrollLeft + ox - el.offsetLeft) / el.offsetWidth, fy: (root.scrollTop + oy - el.offsetTop) / el.offsetHeight, ox, oy }
  }

  const goPage = useCallback((n: number, smooth = false) => {
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-page="${n}"]`)
    const root = scrollRef.current
    if (el && root) root.scrollTo({ top: el.offsetTop - 12, behavior: smooth ? "smooth" : "auto" })
  }, [])

  // 缩放之后：新比例的页面排好了，把锚点放回原处
  useLayoutEffect(() => {
    const a = anchor.current
    const root = scrollRef.current
    if (!a || !root) return
    const el = root.querySelector<HTMLElement>(`[data-page="${a.n}"]`)
    if (!el) return
    anchor.current = null
    root.scrollLeft = el.offsetLeft + a.fx * el.offsetWidth - a.ox
    root.scrollTop = el.offsetTop + a.fy * el.offsetHeight - a.oy
  }, [view, rot])

  // 记住上次读到的页（本浏览器、按文件）：页码变了过一会儿写；打开时跳回去
  const restored = useRef(false)
  useEffect(() => {
    if (!doc || restored.current || !sizes[1]) return
    restored.current = true
    try {
      const n = Number(localStorage.getItem(memKey))
      if (n > 1 && n <= doc.numPages) requestAnimationFrame(() => goPage(n))
    } catch {}
  }, [doc, sizes, memKey, goPage])
  useEffect(() => {
    if (!restored.current) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(memKey, String(page))
      } catch {}
    }, 800)
    return () => clearTimeout(t)
  }, [page, memKey])

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
  }, [doc, view, box, rot])

  // 手形拖动（浏览工具）：按住拖页面；点到标注/按钮上不拖
  useEffect(() => {
    const root = scrollRef.current
    if (!root || !hand) return
    let start: { x: number; y: number; l: number; t: number; id: number } | null = null
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || (e.target as Element).closest(".pointer-events-auto, button, a, input, [data-no-pan]")) return
      start = { x: e.clientX, y: e.clientY, l: root.scrollLeft, t: root.scrollTop, id: e.pointerId }
      root.setPointerCapture(e.pointerId)
      root.dataset.panning = "1"
    }
    const move = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return
      root.scrollLeft = start.l - (e.clientX - start.x)
      root.scrollTop = start.t - (e.clientY - start.y)
    }
    const up = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return
      start = null
      delete root.dataset.panning
      root.releasePointerCapture(e.pointerId)
    }
    root.addEventListener("pointerdown", down)
    root.addEventListener("pointermove", move)
    root.addEventListener("pointerup", up)
    root.addEventListener("pointercancel", up)
    return () => {
      root.removeEventListener("pointerdown", down)
      root.removeEventListener("pointermove", move)
      root.removeEventListener("pointerup", up)
      root.removeEventListener("pointercancel", up)
    }
  }, [hand, doc])

  // Ctrl/⌘ + 滚轮（含触控板双指捏合）：以指针为中心缩放。要非被动监听才能拦掉浏览器整页缩放
  const wheelState = useRef({ shown, zoomTo })
  useEffect(() => {
    wheelState.current = { shown, zoomTo }
  })
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    let acc = 1
    let raf = 0
    let last: WheelEvent | null = null
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      acc *= Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0025))
      last = e
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const ev = last!
        const pageEl = (ev.target as Element).closest<HTMLElement>("[data-page]")
        const rb = root.getBoundingClientRect()
        const ox = ev.clientX - rb.left
        const oy = ev.clientY - rb.top
        const a = pageEl
          ? {
              n: Number(pageEl.dataset.page),
              fx: (root.scrollLeft + ox - pageEl.offsetLeft) / pageEl.offsetWidth,
              fy: (root.scrollTop + oy - pageEl.offsetTop) / pageEl.offsetHeight,
              ox,
              oy,
            }
          : undefined
        const next = wheelState.current.shown * acc
        acc = 1
        wheelState.current.zoomTo(next, a)
      })
    }
    root.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      root.removeEventListener("wheel", onWheel)
      cancelAnimationFrame(raf)
    }
  }, [doc])

  // 查找：逐页取文字（缓存），数出现次数；跳到第 i 处所在的页
  const runFind = async (q: string) => {
    if (!doc || !q.trim()) return setFind((f) => ({ ...f, q, hits: [], i: 0 }))
    setFind((f) => ({ ...f, q, busy: true }))
    // 去掉空白再比：中文 PDF 的文字层常把字、数字拆开（「2 0 18」「防 火」）
    const needle = q.replace(/\s+/g, "").toLowerCase()
    const hits: { n: number; c: number }[] = []
    let withText = 0
    for (let n = 1; n <= doc.numPages; n++) {
      let t = texts.current.get(n)
      if (t === undefined) {
        const pg = await doc.getPage(n)
        const tc = await pg.getTextContent()
        t = tc.items.map((it) => ("str" in it ? it.str : "")).join("").replace(/\s+/g, "").toLowerCase()
        texts.current.set(n, t)
      }
      if (t.trim().length > 20) withText++
      let c = 0
      for (let k = t.indexOf(needle); k >= 0; k = t.indexOf(needle, k + needle.length)) c++
      if (c) hits.push({ n, c })
    }
    setFind((f) => ({ ...f, hits, i: 0, busy: false, withText }))
    if (hits[0]) goPage(hits[0].n, true)
  }
  const findTotal = find.hits.reduce((a, h) => a + h.c, 0)
  const findJump = (dir: 1 | -1) => {
    if (!find.hits.length) return
    const i = (find.i + dir + find.hits.length) % find.hits.length
    setFind((f) => ({ ...f, i }))
    goPage(find.hits[i].n, true)
  }

  // 键盘：焦点在查看器里时生效 —— PageUp/PageDown/Home/End 翻页，Ctrl/⌘+F 查找，Ctrl/⌘ + / − / 0 缩放
  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as Element).closest("input")) return
    const mod = e.ctrlKey || e.metaKey
    if (mod && e.key.toLowerCase() === "f") {
      e.preventDefault()
      setFind((f) => ({ ...f, open: true }))
      requestAnimationFrame(() => findRef.current?.focus())
    } else if (mod && (e.key === "=" || e.key === "+")) {
      e.preventDefault()
      step(1)
    } else if (mod && e.key === "-") {
      e.preventDefault()
      step(-1)
    } else if (mod && e.key === "0") {
      e.preventDefault()
      setView({ mode: "fit" })
    } else if (e.key === "PageDown" || e.key === "PageUp") {
      e.preventDefault()
      goPage(Math.max(1, Math.min(doc?.numPages ?? 1, page + (e.key === "PageDown" ? 1 : -1))))
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault()
      goPage(e.key === "Home" ? 1 : (doc?.numPages ?? 1))
    }
  }

  if (error) return <p className="p-8 text-center text-sm text-destructive">{error}</p>
  if (!doc)
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="mx-auto aspect-[210/297] w-full max-w-2xl" />
      </div>
    )

  const viewKey = `${view.mode === "fixed" ? `s${view.scale}` : `${view.mode}${box.w}x${box.h}`}-r${rot}`
  const tb = "size-7 shrink-0"
  return (
    // @container：工具栏的文字标签按查看器自己的宽度显示（放进右侧抽屉时窗口宽、查看器窄）
    <div className="@container flex h-full min-h-0 flex-col" onKeyDown={onKeyDown}>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 border-b px-3 py-1.5">
        <Button variant="ghost" size="icon-sm" className={tb} disabled={shown <= ZOOMS[0] + 0.001} onClick={() => step(-1)} aria-label="缩小" title="缩小（Ctrl −）">
          <MinusIcon />
        </Button>
        <span className="w-11 text-center text-xs text-muted-foreground tabular-nums">{Math.round(shown * 100)}%</span>
        <Button variant="ghost" size="icon-sm" className={tb} disabled={shown >= ZOOMS[ZOOMS.length - 1] - 0.001} onClick={() => step(1)} aria-label="放大" title="放大（Ctrl +，或 Ctrl + 滚轮）">
          <PlusIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" className={cn(tb, view.mode === "fit" && "bg-accent text-foreground")} aria-pressed={view.mode === "fit"} onClick={() => setView({ mode: "fit" })} aria-label="适应宽度" title="适应宽度：每一页都按窗口宽度显示（Ctrl 0）">
          <MoveHorizontalIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" className={cn(tb, view.mode === "page" && "bg-accent text-foreground")} aria-pressed={view.mode === "page"} onClick={() => setView({ mode: "page" })} aria-label="适应整页" title="适应整页：一页完整放进窗口">
          <ScanIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" className={cn(tb, boxZoom && "bg-accent text-foreground")} aria-pressed={boxZoom} data-boxzoom-toggle onClick={() => { setBoxZoom((v) => !v); setTextMode(false) }} aria-label={boxZoom ? "取消框选放大" : "框选放大"} title="框选放大：在页面上拖一个框，松手就把框里的内容放大到填满窗口">
          <ZoomInIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" className={tb} onClick={() => { anchor.current = null; setRot((r) => (r + 90) % 360) }} aria-label="旋转" title="顺时针旋转 90°">
          <RotateCwIcon />
        </Button>
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        <Button variant="ghost" size="icon-sm" className={tb} disabled={page <= 1} onClick={() => goPage(page - 1)} aria-label="上一页" title="上一页（PageUp）">
          <ChevronUpIcon />
        </Button>
        <form
          className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums"
          onSubmit={(e) => {
            e.preventDefault()
            const n = Number(pageInput)
            if (n >= 1 && n <= doc.numPages) goPage(n)
            setPageInput("")
          }}
        >
          <Input
            data-page-input
            aria-label="跳到第几页"
            value={pageInput}
            placeholder={String(page)}
            onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ""))}
            className="h-6 w-10 px-1 text-center text-xs"
          />
          <span className="whitespace-nowrap">/ {doc.numPages}</span>
        </form>
        <Button variant="ghost" size="icon-sm" className={tb} disabled={page >= doc.numPages} onClick={() => goPage(page + 1)} aria-label="下一页" title="下一页（PageDown）">
          <ChevronDownIcon />
        </Button>
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        <Button variant="ghost" size="icon-sm" className={cn(tb, outlineOpen && "bg-accent text-foreground")} aria-pressed={outlineOpen} data-outline-toggle onClick={() => setOutlineOpen((v) => !v)} aria-label="目录" title="目录（PDF 自带的书签）">
          <ListTreeIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" className={cn(tb, find.open && "bg-accent text-foreground")} aria-pressed={find.open} data-find-toggle onClick={() => { setFind((f) => ({ ...f, open: !f.open })); requestAnimationFrame(() => findRef.current?.focus()) }} aria-label="查找" title="在原件里查找（Ctrl F）">
          <SearchIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" className={cn(tb, textMode && "bg-accent text-foreground")} aria-pressed={textMode} data-text-toggle onClick={() => { setTextMode((v) => !v); setBoxZoom(false) }} aria-label="选文字" title="选文字：可以选中、复制原件里的文字（扫描件没有文字）">
          <TextCursorIcon />
        </Button>
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        {annot.toolbar}
      </div>
      {find.open && (
        <form
          data-find-bar
          className="flex items-center gap-2 border-b bg-surface px-3 py-1.5 text-xs"
          onSubmit={(e) => {
            e.preventDefault()
            if (find.hits.length && find.q === findRef.current?.value) findJump(1)
            else runFind(findRef.current?.value ?? "")
          }}
        >
          <SearchIcon className="size-3.5 text-muted-foreground" />
          <Input
            ref={findRef}
            defaultValue={find.q}
            placeholder="在原件里查找，回车找下一处"
            className="h-7 max-w-64 text-xs"
            onKeyDown={(e) => {
              // Esc 只关查找条：不往外传，否则外面的抽屉也会被 Esc 关掉（2026-09-26 实测撞到）
              if (e.key === "Escape") {
                e.stopPropagation()
                e.nativeEvent.stopImmediatePropagation()
                setFind((f) => ({ ...f, open: false }))
                scrollRef.current?.focus()
              }
            }}
          />
          <span data-find-status className="text-muted-foreground tabular-nums">
            {find.busy
              ? "正在查…"
              : find.q
                ? findTotal
                  ? `第 ${find.hits[find.i]?.n} 页 · 共 ${findTotal} 处（${find.hits.length} 页）`
                  : "没有找到"
                : ""}
          </span>
          {/* 查不全要明说，不然「共 2 处」会被当成全书只有 2 处：扫描件要么没有文字层，要么文字层是出版方粗识别的乱码
              （2026-09-26 实测 GB 50016 书库原件：每页都有字，但多是「^ 0」「〇〇」这类错字） */}
          {!find.busy && find.q && (
            <span data-find-coverage className="text-warning">
              {find.withText < doc.numPages * 0.8 ? `原件 ${doc.numPages} 页里只有 ${find.withText} 页带文字；` : ""}
              只查原件自带的文字层，扫描件常常不准 —— 全文查找请切到「文本」
            </span>
          )}
          <Button type="button" variant="ghost" size="icon-sm" disabled={!find.hits.length} onClick={() => findJump(-1)} aria-label="上一个有结果的页" title="上一个有结果的页">
            <ChevronUpIcon />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" disabled={!find.hits.length} onClick={() => findJump(1)} aria-label="下一个有结果的页" title="下一个有结果的页（回车）">
            <ChevronDownIcon />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" className="ml-auto" onClick={() => setFind((f) => ({ ...f, open: false }))} aria-label="关闭查找">
            <XIcon />
          </Button>
        </form>
      )}
      {banner}
      <div className="flex min-h-0 flex-1">
        {outlineOpen && (
          <nav data-outline aria-label="目录" className="w-56 shrink-0 overflow-y-auto border-r bg-surface p-2 text-sm">
            {outline === undefined ? (
              <p className="p-2 text-xs text-muted-foreground">正在读目录…</p>
            ) : outline === null ? (
              <p className="p-2 text-xs text-muted-foreground">这份 PDF 没有自带目录（书签）。可以用上面的页码跳转，或查找。</p>
            ) : (
              <OutlineList items={outline} current={page} onGo={(n) => goPage(n)} />
            )}
          </nav>
        )}
        <div
          ref={scrollRef}
          tabIndex={0}
          data-pdf-scroll
          className={cn(
            "relative min-w-0 flex-1 overflow-auto bg-surface-sunken outline-none",
            boxZoom && "cursor-crosshair select-none",
            hand && "cursor-grab select-none data-[panning]:cursor-grabbing",
          )}
        >
          <div className="flex w-max min-w-full flex-col items-center gap-4 p-6">
            {Array.from({ length: doc.numPages }, (_, i) => (
              <PdfPage
                key={`${i}-${viewKey}`}
                doc={doc}
                n={i + 1}
                view={view}
                box={box}
                rot={rot}
                guess={sizes[i + 1] ?? sizes[1]}
                onSize={onSize}
                root={scrollRef}
                overlay={annot.layer}
                textMode={textMode}
                query={find.open ? find.q : ""}
              />
            ))}
          </div>
          {boxZoom && (
            <BoxZoom
              root={scrollRef}
              onZoom={(n, fx, fy, fw) => {
                const w = dims(n).w
                zoomTo((box.w || 600) / (fw * w), { n, fx, fy, ox: 24, oy: 24 })
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

function OutlineList({ items, current, onGo, depth = 0 }: { items: OutlineItem[]; current: number; onGo: (n: number) => void; depth?: number }) {
  return (
    <ul>
      {items.map((it, i) => (
        <li key={i}>
          <button
            type="button"
            disabled={!it.page}
            onClick={() => it.page && onGo(it.page)}
            className={cn(
              "flex w-full cursor-pointer items-baseline gap-2 rounded px-2 py-1 text-left hover:bg-accent disabled:cursor-default disabled:opacity-50",
              it.page === current && "text-primary",
            )}
            style={{ paddingLeft: 8 + depth * 12 }}
            title={it.title}
          >
            <span className="min-w-0 flex-1 truncate">{it.title}</span>
            {it.page && <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{it.page}</span>}
          </button>
          {it.items.length > 0 && <OutlineList items={it.items} current={current} onGo={onGo} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  )
}

function PdfPage({
  doc,
  n,
  view,
  box,
  rot,
  guess,
  onSize,
  root,
  overlay,
  textMode,
  query,
}: {
  doc: PDFDocumentProxy
  n: number
  view: View
  /** 查看区可用宽高（CSS 像素）：适应宽度 / 适应整页按它算这一页的比例 */
  box: Size
  /** 用户加的旋转（度） */
  rot: number
  /** 尺寸还没取到时的占位（点）：用已知的这一页或第 1 页 */
  guess?: Size
  onSize: (n: number, w: number, h: number) => void
  root: React.RefObject<HTMLDivElement | null>
  /** 叠加层（标注）：参数是页码、页面宽高（100% 时的点）、当前缩放 */
  overlay?: (page: number, w: number, h: number, displayScale: number) => React.ReactNode
  textMode: boolean
  query: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const [base, setBase] = useState<Size | null>(null)
  const turned = (b: Size) => (rot % 180 ? { w: b.h, h: b.w } : b)
  const eff = (b: Size) => {
    if (view.mode === "fixed") return view.scale
    if (!box.w) return 1
    const d = turned(b)
    return Math.floor((view.mode === "fit" ? box.w / d.w : Math.min(box.w / d.w, box.h / d.h)) * 1000) / 1000
  }

  useEffect(() => {
    let cancelled = false
    let task: { cancel: () => void } | null = null
    let tl: { cancel: () => void } | null = null
    let io: IntersectionObserver | null = null
    doc.getPage(n).then((pg: PDFPageProxy) => {
      if (cancelled) return
      const vp1 = pg.getViewport({ scale: 1 })
      const b = { w: vp1.width, h: vp1.height }
      setBase(b)
      onSize(n, b.w, b.h)
      const s = eff(b)
      const rotation = (pg.rotate + rot) % 360
      // 进入视口附近才渲染（画布 + 文字层）
      io = new IntersectionObserver(
        async ([e]) => {
          if (!e.isIntersecting || !canvasRef.current) return
          io?.disconnect()
          const dpr = window.devicePixelRatio || 1
          // 清晰度封顶：放大很多倍时不按原比例渲染整页（会崩），显示尺寸不变、只是略糊
          const r = Math.min(s * dpr, MAX_CANVAS_W / b.w, Math.sqrt(MAX_CANVAS_PX / (b.w * b.h)))
          const hi = pg.getViewport({ scale: r, rotation })
          const canvas = canvasRef.current
          canvas.width = hi.width
          canvas.height = hi.height
          task = pg.render({ canvas, viewport: hi })
          // 文字层：透明文字叠在画布上，用来选中复制、查找高亮（扫描件没有文字就是空的）
          const host = textRef.current
          if (host) {
            const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
            if (cancelled) return
            host.replaceChildren()
            host.style.setProperty("--total-scale-factor", String(s))
            const layer = new pdfjs.TextLayer({ textContentSource: pg.streamTextContent(), container: host, viewport: pg.getViewport({ scale: s, rotation }) })
            tl = layer
            await layer.render().catch(() => {})
            if (!cancelled) mark(host, query)
          }
        },
        { root: root.current, rootMargin: "600px 0px" },
      )
      if (wrapRef.current) io.observe(wrapRef.current)
    })
    return () => {
      cancelled = true
      io?.disconnect()
      task?.cancel()
      tl?.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 比例/旋转变化时父组件换 key 重建本页
  }, [doc, n, root])

  // 查找词变了：只改高亮，不重画
  useEffect(() => {
    if (textRef.current) mark(textRef.current, query)
  }, [query])

  const b = turned(base ?? guess ?? { w: 595, h: 842 })
  const s = eff(base ?? guess ?? { w: 595, h: 842 })
  return (
    <div ref={wrapRef} data-page={n} className="relative bg-paper shadow-float ring-1 ring-ink/5" style={{ width: b.w * s, height: b.h * s }}>
      <canvas ref={canvasRef} aria-label={`第 ${n} 页`} className="h-full w-full" />
      <div ref={textRef} className={cn("textLayer", !textMode && "pointer-events-none")} />
      {/* 旋转后不显示标注层：标注坐标按未旋转的页面记，转过的页上画会错位（要标注请转回 0°） */}
      {base && rot === 0 && overlay?.(n, base.w, base.h, s)}
    </div>
  )
}

/** 查找高亮：给含查找词的文字片段加 pdf.js 自带的 highlight 样式（跨片段的词只高亮各自那一段） */
function mark(host: HTMLElement, q: string) {
  const needle = q.replace(/\s+/g, "").toLowerCase()
  host.querySelectorAll("span").forEach((sp) => {
    const hit = !!needle && (sp.textContent ?? "").replace(/\s+/g, "").toLowerCase().includes(needle)
    sp.classList.toggle("highlight", hit)
    sp.classList.toggle("selected", hit)
  })
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
