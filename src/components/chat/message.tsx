"use client"

import { LoaderCircleIcon } from "lucide-react"

import { BlockRenderer, type BlockContext } from "@/components/blocks/registry"
import type { Message } from "@/lib/chat/types"
import { cn } from "@/lib/utils"

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

  return (
    <div className={cn("space-y-4", message.streaming && "[&_p:last-child]:after:ml-0.5 [&_p:last-child]:after:inline-block [&_p:last-child]:after:h-4 [&_p:last-child]:after:w-1.5 [&_p:last-child]:after:animate-pulse [&_p:last-child]:after:bg-foreground/60 [&_p:last-child]:after:align-[-2px]")}>
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
  )
}
