import Link from "next/link"
import { ArrowRightIcon, BookOpenTextIcon, LockIcon, MessageSquareIcon, SearchIcon, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Logo } from "@/components/shell/logo"
import { SourceKindBadge } from "@/components/source/source-kind-badge"
import { SOURCES } from "@/lib/sources/mock"

/**
 * 访客首页：简单介绍 + 常见用法 + 受限的资料预览 + 登录入口。
 * 访客只能看到 public 资料的摘要；member 资料只显示标题并上锁。
 */
export default function HomePage() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
            <a href="#usage" className="hover:text-foreground">
              使用方式
            </a>
            <a href="#preview" className="hover:text-foreground">
              资料预览
            </a>
          </nav>
          <Button asChild size="sm" className="ml-auto">
            <Link href="/chat">登录</Link>
          </Button>
        </div>
      </header>

      <main>
        {/* Hero：一句话说清“是什么、给谁用” */}
        <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24">
          <p className="text-sm font-medium text-primary">面向建筑师的知识工作台</p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-[1.15] font-semibold tracking-tight text-balance sm:text-5xl">
            规范、图集、书籍与项目资料，一问即得，一点即读
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            用对话提问，或按类型、地区、年份精确检索。每个回答都标明出处，点一下就能对照原文。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/chat">
                登录并开始使用
                <ArrowRightIcon />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#usage">了解使用方式</a>
            </Button>
          </div>

          <ProductSketch />
        </section>

        {/* 常见使用方式 */}
        <section id="usage" className="border-t bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight">三种常见用法</h2>
            <p className="mt-2 text-muted-foreground">从“问”到“找”再到“读”，三种方式可以随时切换。</p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <UsageCard
                step="01"
                icon={MessageSquareIcon}
                title="问：用对话提问"
                desc="用自然语言问规范条文、构造做法或某个项目。回答中的编号就是出处。"
                example="“上海住宅的日照间距要求是什么？”"
              />
              <UsageCard
                step="02"
                icon={SearchIcon}
                title="找：按条件检索"
                desc="已经知道要找什么时，按资料类型、地区、年份筛选，比对话更快、更准。"
                example="类型：规范 · 地区：上海 · 2019"
              />
              <UsageCard
                step="03"
                icon={BookOpenTextIcon}
                title="读：进入阅读模式"
                desc="在右侧预览确认后进入阅读模式。右下角的 AI 助手可以就当前文档回答问题。"
                example="目录跳转 · 字号调节 · 就文提问"
              />
            </div>
          </div>
        </section>

        {/* 访客可见的有限信息 */}
        <section id="preview" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">资料库预览</h2>
              <p className="mt-2 text-muted-foreground">访客可以查看部分公开资料的摘要，登录后可以阅读全文并使用 AI 对话。</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/chat">登录查看全部</Link>
            </Button>
          </div>
          <ul className="mt-8 divide-y rounded-xl border bg-surface">
            {SOURCES.slice(0, 6).map((s) => (
              <li key={s.id} className="flex items-start gap-4 p-4 sm:p-5">
                <SourceKindBadge kind={s.kind} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.title}</p>
                  {s.access === "public" ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.summary}</p>
                  ) : (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <LockIcon className="size-3.5" />
                      登录后可查看摘要与全文
                    </p>
                  )}
                </div>
                <span className="text-sm text-muted-foreground tabular-nums">{s.year}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6">
          <Logo withText={false} />
          <span>Imagination · 建筑知识工作台（开发中）</span>
          <Link href="/design" className="ml-auto hover:text-foreground">
            设计系统
          </Link>
        </div>
      </footer>
    </div>
  )
}

function UsageCard({
  step,
  icon: Icon,
  title,
  desc,
  example,
}: {
  step: string
  icon: LucideIcon
  title: string
  desc: string
  example: string
}) {
  return (
    <div className="rounded-xl border bg-background p-6">
      <div className="flex items-center justify-between">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary-subtle text-primary">
          <Icon className="size-5" />
        </span>
        <span className="font-mono text-sm text-muted-foreground">{step}</span>
      </div>
      <h3 className="mt-5 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      <p className="mt-4 rounded-md bg-surface-sunken px-3 py-2 text-sm">{example}</p>
    </div>
  )
}

/** 产品示意图：用色块画出“对话 + 右侧预览”的结构，而不是放截图（截图会随开发频繁过期） */
function ProductSketch() {
  return (
    <div className="mt-16 overflow-hidden rounded-2xl border bg-surface shadow-float" aria-hidden>
      <div className="flex h-8 items-center gap-1.5 border-b px-3">
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="size-2.5 rounded-full bg-border-strong" />
      </div>
      <div className="grid h-72 grid-cols-[56px_1fr] sm:h-80 md:grid-cols-[56px_1.2fr_1fr]">
        <div className="space-y-2 border-r bg-sidebar p-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`h-7 rounded-md ${i === 1 ? "bg-primary-subtle" : "bg-sidebar-accent"}`} />
          ))}
        </div>
        <div className="flex flex-col gap-3 p-5">
          <div className="ml-auto h-8 w-2/3 rounded-xl bg-secondary" />
          <div className="h-3 w-11/12 rounded bg-muted" />
          <div className="h-3 w-4/5 rounded bg-muted" />
          <div className="flex gap-1.5">
            <span className="h-4 w-4 rounded-sm bg-primary" />
            <span className="h-4 w-4 rounded-sm bg-secondary" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-12 rounded-lg border" />
            <div className="h-12 rounded-lg border border-primary/60 bg-primary-subtle/50" />
          </div>
          <div className="mt-auto h-12 rounded-2xl border border-border-strong" />
        </div>
        <div className="hidden flex-col gap-3 border-l p-5 md:flex">
          <div className="h-4 w-1/3 rounded bg-secondary" />
          <div className="h-5 w-3/4 rounded bg-foreground/80" />
          <div className="h-3 w-1/2 rounded bg-muted" />
          <div className="mt-2 space-y-2 border-l-2 border-primary bg-surface-sunken p-3">
            <div className="h-2.5 w-full rounded bg-border-strong" />
            <div className="h-2.5 w-5/6 rounded bg-border-strong" />
            <div className="h-2.5 w-4/6 rounded bg-border-strong" />
          </div>
        </div>
      </div>
    </div>
  )
}
