"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { mockRespond, type Responder } from "@/lib/chat/mock-responder"
import type { ChatMode } from "@/lib/chat/modes"
import type { Block, Message } from "@/lib/chat/types"

let seq = 0
const uid = () => `m${Date.now().toString(36)}${seq++}`

/**
 * 对话状态（演示版）：模拟“检索中 → 逐字输出 → 附上结果块”的节奏。
 * 接入真实后端时，只替换这个 hook 的实现，界面组件不动。
 */
export function useMockChat(respond: Responder = mockRespond) {
  const [messages, setMessages] = useState<Message[]>([])
  const timers = useRef<number[]>([])
  const busy = messages.some((m) => m.streaming)

  const clear = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  useEffect(() => clear, [])

  const stop = useCallback(() => {
    clear()
    setMessages((ms) => ms.map((m) => (m.streaming ? { ...m, streaming: false, status: undefined } : m)))
  }, [])

  const send = useCallback(
    (text: string, mode: ChatMode = "rigorous") => {
      const q = text.trim()
      if (!q || busy) return
      const { status, blocks } = respond(q, mode)
      const aid = uid()
      setMessages((ms) => [
        ...ms,
        { id: uid(), role: "user", blocks: [{ type: "text", content: q }] },
        { id: aid, role: "assistant", blocks: [], streaming: true, status, mode },
      ])

      const first = blocks[0]
      const full = first?.type === "text" ? first.content : ""
      const rest = first?.type === "text" ? blocks.slice(1) : blocks
      const update = (patch: Partial<Message>) =>
        setMessages((ms) => ms.map((m) => (m.id === aid ? { ...m, ...patch } : m)))

      let i = 0
      const tick = () => {
        i = Math.min(full.length, i + 3)
        update({ status: undefined, blocks: [{ ...(first as Extract<Block, { type: "text" }>), content: full.slice(0, i) }] })
        if (i < full.length) timers.current.push(window.setTimeout(tick, 16))
        else update({ blocks, streaming: false })
      }
      // 先显示“检索中”状态 700ms，再开始逐字输出（Doherty 阈值：400ms 内必须有反馈）
      timers.current.push(window.setTimeout(full ? tick : () => update({ blocks: rest, streaming: false, status: undefined }), 700))
    },
    [busy, respond],
  )

  return { messages, send, stop, busy, reset: () => (stop(), setMessages([])) }
}
