"use client"

import { BookmarkPlusIcon, LoaderCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BlockRenderer, type BlockContext } from "@/components/blocks/registry"
import { SaveToNotebook } from "@/components/notebook/save-to-notebook"
import { CHAT_MODES } from "@/lib/chat/modes"
import type { Message } from "@/lib/chat/types"
import { cn } from "@/lib/utils"

/** 把一条回答整理成笔记正文：正文 + 联想，保留引用来源 */
function answerToNote(message: Message) {
  const text = message.blocks
    .map((b) => (b.type === "text" ? b.content : b.type === "idea" ? `【联想】${b.content}` : ""))
    .filter(Boolean)
    .join("\n\n")
  const firstCite = message.blocks.find((b) => b.type === "text")
  return {
    kind: "answer" as const,
    text,
    sourceId: firstCite?.type === "text" ? firstCite.citations?.[0] : undefined,
  }
}

/**
 * 消息。用户消息用浅色气泡靠右；AI 回答不用气泡、占满宽度——
 * 因为 AI 回答里有图片网格、资料卡片等宽内容，放进气泡会很局促（ChatGPT / Claude 的做法）。
 */
export function MessageView({ message, ctx }: { message: Message; ctx: BlockContext }) {
  if (message.role === "user") {
    const text = message.blocks[0]?.type === "text" ? message.blocks[0].content : ""
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
          {text}
        </p>
      </div>
    )
  }

  const mode = message.mode ? CHAT_MODES[message.mode] : null

  return (
    <div className="group/msg">
      {mode && (
        <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
          <mode.icon className="size-3.5" />
          {mode.label}
        </p>
      )}
      <div
        className={cn(
          "space-y-4",
          message.streaming &&
            "[&_p:last-child]:after:ml-0.5 [&_p:last-child]:after:inline-block [&_p:last-child]:after:h-4 [&_p:last-child]:after:w-1.5 [&_p:last-child]:after:animate-pulse [&_p:last-child]:after:bg-foreground/60 [&_p:last-child]:after:align-[-2px]",
        )}
      >
        {message.status && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <LoaderCircleIcon className="size-4 animate-spin text-primary" />
            {message.status}
          </p>
        )}
        {message.blocks.map((b, i) => (
          <div key={i} className="animate-in duration-300 fade-in-0">
            <BlockRenderer block={b} ctx={ctx} />
          </div>
        ))}
      </div>
      {!message.streaming && message.blocks.some((b) => b.type === "text" || b.type === "idea") && (
        // 操作栏：平时半透明，悬停这条消息时变清楚（手机上始终可见）
        <div className="mt-3 flex gap-1 transition-opacity md:opacity-60 md:group-hover/msg:opacity-100">
          <SaveToNotebook note={() => answerToNote(message)}>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <BookmarkPlusIcon />
              存入笔记本
            </Button>
          </SaveToNotebook>
        </div>
      )}
    </div>
  )
}
