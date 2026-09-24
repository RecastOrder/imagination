"use client"

import { useEffect, useRef } from "react"

import type { BlockContext } from "@/components/blocks/registry"
import type { Message } from "@/lib/chat/types"
import { MessageView } from "./message"

/** 消息流：新消息出现时自动滚到底部 */
export function Thread({ messages, ctx }: { messages: Message[]; ctx: BlockContext }) {
  const endRef = useRef<HTMLDivElement>(null)
  const last = messages.at(-1)
  const lastLen = last?.blocks.length ?? 0

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length, lastLen, last?.streaming])

  return (
    <div className="space-y-8">
      {messages.map((m) => (
        <MessageView key={m.id} message={m} ctx={ctx} />
      ))}
      <div ref={endRef} />
    </div>
  )
}
