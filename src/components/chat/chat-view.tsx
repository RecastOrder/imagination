"use client"

import { BookMarkedIcon, ImageIcon, LibraryIcon, ScaleIcon, type LucideIcon } from "lucide-react"

import { usePeek } from "@/hooks/use-peek"
import { Composer } from "./composer"
import { Thread } from "./thread"
import { useMockChat } from "./use-mock-chat"

const EXAMPLES: { icon: LucideIcon; title: string; prompt: string }[] = [
  { icon: ScaleIcon, title: "问规范", prompt: "上海住宅的日照间距要求是什么？" },
  { icon: ImageIcon, title: "找项目图片", prompt: "安藤忠雄光之教堂的相关报道和图片" },
  { icon: LibraryIcon, title: "找一本书", prompt: "亚历山大《建筑的永恒之道》讲了什么" },
  { icon: BookMarkedIcon, title: "查构造做法", prompt: "平屋面防水构造有哪些标准做法" },
]

/**
 * 对话页。两种状态：
 * - 空状态：输入框居中 + 示例问题（告诉用户“能问什么”，比空白输入框更友好）
 * - 对话中：消息流在上，输入框固定在底部
 */
export function ChatView() {
  const { messages, send, stop, busy } = useMockChat()
  const { peekId, openPeek } = usePeek()
  const ctx = { peekId, openPeek }

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-4 py-10">
        <div className="w-full max-w-2xl">
          <h1 className="text-center text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            今天想查点什么？
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            基于你的知识库回答：规范、图集、书籍、杂志与项目报道
          </p>
          <div className="mt-8">
            <Composer onSend={send} autoFocus />
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {EXAMPLES.map(({ icon: Icon, title, prompt }) => (
              <button
                key={title}
                type="button"
                onClick={() => send(prompt)}
                className="flex cursor-pointer items-start gap-3 rounded-lg border bg-surface/60 p-3 text-left transition-colors hover:border-border-strong hover:bg-surface"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{prompt}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* 对话列最大 720px：阅读舒适的行宽，宽屏上也不会拉得太长 */}
        <div className="mx-auto w-full max-w-3xl px-4 pt-8 pb-6 sm:px-6">
          <Thread messages={messages} ctx={ctx} />
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 pb-4 sm:px-6">
        <Composer onSend={send} onStop={stop} busy={busy} placeholder="继续追问…" />
        <p className="mt-2 text-center text-xs text-muted-foreground">
          回答基于知识库生成，重要条文请以原文为准
        </p>
      </div>
    </div>
  )
}
