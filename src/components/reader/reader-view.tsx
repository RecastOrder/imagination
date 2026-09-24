"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeftIcon, MinusIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SourceKindBadge } from "@/components/source/source-kind-badge"
import { SourceMeta } from "@/components/source/source-meta"
import { ThemeToggle } from "@/components/shell/theme-toggle"
import type { Source } from "@/lib/sources/types"
import { cn } from "@/lib/utils"
import { AssistantLauncher, ReaderAssistant } from "./reader-assistant"

const FONT_STEPS = [15, 16, 17, 18, 20]

/**
 * 阅读模式：专注阅读，隐藏主导航。
 * 结构：顶栏（返回 / 标题 / 字号）→ 左侧目录 → 正文（衬线、限制行宽）→ 右侧 AI 助手（按需）
 */
export function ReaderView({ source }: { source: Source }) {
  const [fontIdx, setFontIdx] = useState(2)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [current, setCurrent] = useState(source.sections[0]?.id)

  // 目录高亮当前阅读的章节
  useEffect(() => {
    const els = source.sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e)
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (top) setCurrent(top.target.id)
      },
      { rootMargin: "0px 0px -70% 0px" },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [source])

  const jump = (id: string) => {
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: "smooth", block: "start" })
    el?.animate([{ backgroundColor: "color-mix(in oklch, var(--primary) 12%, transparent)" }, { backgroundColor: "transparent" }], {
      duration: 1600,
    })
  }

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
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <span className="hidden sm:inline-flex">
              <SourceKindBadge kind={source.kind} />
            </span>
            <span className="truncate text-sm font-medium">{source.title}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon-sm" disabled={fontIdx === 0} onClick={() => setFontIdx((i) => i - 1)} aria-label="缩小字号">
              <MinusIcon />
            </Button>
            <span className="w-6 text-center text-xs text-muted-foreground tabular-nums">{FONT_STEPS[fontIdx]}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={fontIdx === FONT_STEPS.length - 1}
              onClick={() => setFontIdx((i) => i + 1)}
              aria-label="放大字号"
            >
              <PlusIcon />
            </Button>
            <span className="ml-1 hidden w-28 sm:block">
              <ThemeToggle />
            </span>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-y-auto scroll-smooth">
            <div className="mx-auto flex max-w-6xl gap-10 px-5 py-10 sm:px-8">
              <nav aria-label="目录" className="sticky top-10 hidden h-fit w-52 shrink-0 xl:block">
                <p className="mb-2 text-xs font-medium text-muted-foreground">目录</p>
                <ol className="space-y-0.5 border-l">
                  {source.sections.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className={cn(
                          "-ml-px block border-l-2 border-transparent py-1 pl-3 text-sm text-muted-foreground hover:text-foreground",
                          current === s.id && "border-primary font-medium text-foreground",
                        )}
                      >
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>

              <article className="mx-auto w-full max-w-(--reader-measure) min-w-0">
                <h1 className="font-serif text-3xl leading-tight font-semibold text-balance">{source.title}</h1>
                <SourceMeta source={source} className="mt-3 text-sm" />
                <p className="mt-6 border-y py-4 text-sm leading-relaxed text-muted-foreground">{source.summary}</p>

                <div className="font-serif" style={{ fontSize: FONT_STEPS[fontIdx] }}>
                  {source.sections.map((s) => (
                    <section key={s.id} id={s.id} className="scroll-mt-6 rounded-md">
                      <h2 className="mt-10 mb-4 font-sans text-lg font-semibold">{s.title}</h2>
                      {s.paragraphs.map((p, i) => (
                        <p key={i} className="mb-5 leading-[1.9] text-pretty">
                          {p}
                        </p>
                      ))}
                    </section>
                  ))}
                </div>
                <div className="h-32" />
              </article>
            </div>
          </div>

          <ReaderAssistant source={source} open={assistantOpen} onOpenChange={setAssistantOpen} onJump={jump} />
        </div>

        {!assistantOpen && <AssistantLauncher onClick={() => setAssistantOpen(true)} />}
      </div>
    </TooltipProvider>
  )
}
