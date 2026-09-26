"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AlignLeftIcon, ArrowLeftIcon, FileImageIcon, MinusIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Segmented } from "@/components/ui/segmented"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SourceKindBadge } from "@/components/source/source-kind-badge"
import { SourceMeta } from "@/components/source/source-meta"
import { ThemeToggle } from "@/components/shell/theme-toggle"
import { SOURCE_KINDS } from "@/lib/sources/kinds"
import type { Source } from "@/lib/sources/types"
import { cn } from "@/lib/utils"
import { OriginalView } from "./original-view"
import { HoldOriginalView } from "./hold-original-view"
import { AssistantLauncher, ReaderAssistant } from "./reader-assistant"
import { SelectionToolbar } from "./selection-toolbar"
import { TextView } from "./text-view"

type View = "text" | "original"

const FONT_STEPS = [15, 16, 17, 18, 20]
const ZOOM_STEPS = [0.6, 0.75, 0.9, 1]

/**
 * 阅读模式：专注阅读，隐藏主导航。
 * 结构：顶栏（返回 / 标题 / 视图切换 / 字号）→ 左侧目录 → 正文 → 右侧 AI 助手（按需）
 *
 * 两种视图：
 * - 文本：解析后的文字，可调字号、可高亮摘录（规范、文章默认）
 * - 原版：和纸质版一致的 PDF 页面（图集默认）
 * 切换时保持位置：文本的当前章节 ⇄ 原版的对应页码。
 */
export function ReaderView({ source }: { source: Source }) {
  // 没有原件的资料（hold 资料在接入原件之前）一律从文本打开：原版视图此刻只有演示页面，不能拿它冒充原件
  const noOriginal = source.hasOriginal === false
  const [view, setView] = useState<View>(noOriginal ? "text" : SOURCE_KINDS[source.kind].defaultView)
  const [step, setStep] = useState({ text: 2, original: 2 })
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [quote, setQuote] = useState<string | null>(null)
  const [current, setCurrent] = useState(source.sections[0]?.id)
  const [page, setPage] = useState(1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const articleRef = useRef<HTMLElement>(null)

  // 跟踪当前阅读位置：文本视图看章节，原版视图看页码
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const targets =
      view === "text"
        ? source.sections.map((s) => document.getElementById(s.id))
        : Array.from(root.querySelectorAll<HTMLElement>("[data-page]"))
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (!top) return
        const el = top.target as HTMLElement
        if (view === "text") setCurrent(el.id)
        else {
          const p = Number(el.dataset.page)
          setPage(p)
          const sec = [...source.sections].reverse().find((s) => s.page <= p)
          if (sec) setCurrent(sec.id)
        }
      },
      { root, rootMargin: "0px 0px -70% 0px" },
    )
    targets.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [source, view])

  const scrollTo = (id: string, flash = false) => {
    const el = document.getElementById(id)
    el?.scrollIntoView({ block: "start" })
    if (flash)
      el?.animate(
        [{ backgroundColor: "color-mix(in oklch, var(--primary) 12%, transparent)" }, { backgroundColor: "transparent" }],
        { duration: 1600 },
      )
  }

  const goSection = (id: string) => {
    const sec = source.sections.find((s) => s.id === id)
    if (view === "text") scrollTo(id, true)
    else if (sec) scrollTo(`page-${sec.page}`)
  }

  const switchView = (next: View) => {
    const sec = source.sections.find((s) => s.id === current)
    setView(next)
    // 等新视图渲染后再定位到对应位置
    requestAnimationFrame(() => {
      if (next === "original") scrollTo(`page-${sec?.page ?? page}`)
      else if (sec) scrollTo(sec.id)
    })
  }

  const steps = view === "text" ? FONT_STEPS : ZOOM_STEPS
  const idx = step[view]
  const bump = (d: number) => setStep((s) => ({ ...s, [view]: s[view] + d }))

  return (
    <TooltipProvider>
      <div className="flex h-dvh flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-2 sm:px-4">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/library?peek=${source.id}`}>
              <ArrowLeftIcon />
              <span className="hidden sm:inline">资料库</span>
            </Link>
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-2 md:justify-center">
            <span className="hidden md:inline-flex">
              <SourceKindBadge kind={source.kind} />
            </span>
            <span className="hidden truncate text-sm font-medium sm:inline">{source.title}</span>
          </div>
          <Segmented
            label="视图"
            value={view}
            onChange={switchView}
            options={[
              { value: "text", title: "解析后的文字，可调字号、可高亮摘录", label: <><AlignLeftIcon />文本</> },
              {
                value: "original",
                title: noOriginal ? "这份资料的原件还没接入，暂时只有文字" : "与纸质版一致的原始页面",
                label: <><FileImageIcon />原版</>,
                disabled: noOriginal,
              },
            ]}
          />
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon-sm" disabled={idx === 0} onClick={() => bump(-1)} aria-label={view === "text" ? "缩小字号" : "缩小页面"}>
              <MinusIcon />
            </Button>
            <span className="w-8 text-center text-xs text-muted-foreground tabular-nums">
              {view === "text" ? steps[idx] : `${Math.round(steps[idx] * 100)}%`}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={idx === steps.length - 1}
              onClick={() => bump(1)}
              aria-label={view === "text" ? "放大字号" : "放大页面"}
            >
              <PlusIcon />
            </Button>
            <span className="ml-1 hidden w-28 lg:block">
              <ThemeToggle />
            </span>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <div ref={scrollRef} className={cn("relative min-w-0 flex-1 overflow-y-auto", view === "original" && "bg-surface-sunken")}>
            <div className="mx-auto flex max-w-6xl gap-10 px-5 py-10 sm:px-8">
              <nav aria-label="目录" className="sticky top-10 hidden h-fit w-52 shrink-0 xl:block">
                <p className="mb-2 text-xs font-medium text-muted-foreground">目录</p>
                <ol className="space-y-0.5 border-l">
                  {source.sections.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => goSection(s.id)}
                        className={cn(
                          "-ml-px flex w-full cursor-pointer items-baseline justify-between gap-2 border-l-2 border-transparent py-1 pl-3 text-left text-sm text-muted-foreground hover:text-foreground",
                          current === s.id && "border-primary font-medium text-foreground",
                        )}
                      >
                        <span className="truncate">{s.title}</span>
                        <span className="font-mono text-[11px] font-normal text-muted-foreground">{s.page}</span>
                      </button>
                    </li>
                  ))}
                </ol>
                {view === "original" && (
                  <p className="mt-4 text-xs text-muted-foreground tabular-nums">
                    第 {page} / {source.pages} 页
                  </p>
                )}
              </nav>

              {view === "text" ? (
                <article ref={articleRef} className="mx-auto w-full max-w-(--reader-measure) min-w-0">
                  <h1 className="font-serif text-3xl leading-tight font-semibold text-balance">{source.title}</h1>
                  <SourceMeta source={source} className="mt-3 text-sm" />
                  {source.summary && <p className="mt-6 border-y py-4 text-sm leading-relaxed text-muted-foreground">{source.summary}</p>}
                  {(source.rights || source.originUrl || noOriginal) && (
                    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                      {noOriginal && "这份资料目前只有识别出的文字，原件还没接入；数字请以原件为准。"}
                      {source.rights && <> 版权：{source.rights}</>}
                      {source.originUrl && (
                        <>
                          {" "}
                          <a href={source.originUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
                            原文出处
                          </a>
                        </>
                      )}
                    </p>
                  )}
                  <p className="mt-4 text-xs text-muted-foreground">提示：选中任意文字，可以高亮、存入笔记本或向 AI 提问。</p>
                  <TextView source={source} fontSize={steps[idx]} />
                  <div className="h-32" />
                </article>
              ) : (
                <div className="mx-auto w-full max-w-3xl min-w-0">
                  {source.hasOriginal ? <HoldOriginalView source={source} /> : <OriginalView source={source} zoom={steps[idx]} />}
                  <div className="h-32" />
                </div>
              )}
            </div>
          </div>

          <ReaderAssistant
            source={source}
            open={assistantOpen}
            onOpenChange={setAssistantOpen}
            onJump={(id) => goSection(id)}
            quote={quote}
            onClearQuote={() => setQuote(null)}
          />
        </div>

        {view === "text" && (
          <SelectionToolbar
            source={source}
            containerRef={articleRef}
            onAsk={(q) => {
              setQuote(q)
              setAssistantOpen(true)
            }}
          />
        )}
        {!assistantOpen && <AssistantLauncher onClick={() => setAssistantOpen(true)} />}
      </div>
    </TooltipProvider>
  )
}
