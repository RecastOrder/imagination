"use client"

import { SparklesIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Composer } from "@/components/chat/composer"
import { Thread } from "@/components/chat/thread"
import { useMockChat } from "@/components/chat/use-mock-chat"
import { useMinWidth } from "@/hooks/use-media-query"
import type { Source } from "@/lib/sources/types"

/**
 * 阅读页右下角的 AI 助手（Copilot 模式）。
 * 复用对话页的 Thread + Composer，只换了“容器”和“上下文”：
 * - 桌面：停靠在右侧（正文自动让位，不被遮挡）
 * - 手机：底部抽屉
 */
export function ReaderAssistant({
  source,
  open,
  onOpenChange,
  onJump,
}: {
  source: Source
  open: boolean
  onOpenChange: (open: boolean) => void
  onJump: (sectionId: string) => void
}) {
  const isLg = useMinWidth("lg")
  const { messages, send, stop, busy } = useMockChat((q) => ({
    status: "正在阅读当前文档…",
    blocks: [
      {
        type: "text",
        content: `（演示回答）关于“${q.slice(0, 20)}”，本文在「${source.sections.at(-1)?.title}」一节有相关论述 [1]，点击编号可跳转到对应段落。`,
        citations: [source.id],
      },
    ],
  }))

  // 在阅读页里，引用编号的作用是“跳转到段落”，而不是打开预览
  const ctx = { peekId: null, openPeek: () => onJump(source.sections.at(-1)!.id) }

  const body = (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b px-4 py-2.5">
        <SparklesIcon className="size-4 text-primary" />
        <span className="text-sm font-medium">AI 助手</span>
        <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={() => onOpenChange(false)} aria-label="关闭助手">
          <XIcon />
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-2 pt-2">
            <p className="text-sm text-muted-foreground">可以就当前文档提问，例如：</p>
            {["总结这份资料的要点", "这部分和国家标准有什么不同？", "列出与层高相关的内容"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => send(p)}
                className="block w-full cursor-pointer rounded-lg border bg-surface px-3 py-2 text-left text-sm hover:border-border-strong"
              >
                {p}
              </button>
            ))}
          </div>
        ) : (
          <Thread messages={messages} ctx={ctx} />
        )}
      </div>
      <div className="p-3">
        <Composer
          size="md"
          onSend={send}
          onStop={stop}
          busy={busy}
          placeholder="就这份资料提问…"
          context={
            <Badge variant="outline" className="max-w-full">
              <span className="truncate">当前文档：{source.title}</span>
            </Badge>
          }
        />
      </div>
    </div>
  )

  if (isLg) {
    if (!open) return null
    return (
      <aside
        aria-label="AI 助手"
        className="flex h-full w-[400px] shrink-0 flex-col border-l bg-surface animate-in duration-200 fade-in-0 slide-in-from-right-4"
      >
        {body}
      </aside>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showClose={false} className="p-0">
        <SheetTitle className="sr-only">AI 助手</SheetTitle>
        {body}
      </SheetContent>
    </Sheet>
  )
}

/** 右下角的唤起按钮：助手关闭时才显示 */
export function AssistantLauncher({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className="fixed right-5 bottom-5 z-40 rounded-full pr-5 pl-4 shadow-float"
      aria-label="打开 AI 助手"
    >
      <SparklesIcon />
      问 AI
    </Button>
  )
}
