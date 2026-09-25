"use client"

import { useCallback, useRef, useState } from "react"

import { applyEvent, emptyTurn, parseSse, toBlocks, type CairnTurnState } from "@/lib/chat/cairn-adapter"
import type { ChatMode } from "@/lib/chat/modes"
import type { Message } from "@/lib/chat/types"

let seq = 0
const uid = () => `c${Date.now().toString(36)}${seq++}`

/**
 * 对话状态（接 Cairn 知识库）：与 useMockChat 同一个接口，界面组件不用改。
 * 走本平台 /api/chat（服务器替当前用户去问 Cairn），逐段显示文字，结束后补上资料与提示。
 */
export function useCairnChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const busy = messages.some((m) => m.streaming)

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setMessages((ms) => ms.map((m) => (m.streaming ? { ...m, streaming: false, status: undefined } : m)))
  }, [])

  const send = useCallback(
    async (text: string, mode: ChatMode = "rigorous") => {
      const q = text.trim()
      if (!q || busy) return
      const aid = uid()
      // 历史只带文字（问题 + 之前的回答正文），不带资料块
      const history = messages.map((m) => ({
        role: m.role,
        content: m.blocks.map((b) => (b.type === "text" ? b.content : "")).join("\n").trim(),
      }))
      setMessages((ms) => [
        ...ms,
        { id: uid(), role: "user", blocks: [{ type: "text", content: q }] },
        { id: aid, role: "assistant", blocks: [], streaming: true, status: "正在检索知识库…", mode },
      ])
      const update = (patch: Partial<Message>) =>
        setMessages((ms) => ms.map((m) => (m.id === aid ? { ...m, ...patch } : m)))
      const fail = (title: string, content: string) =>
        update({ streaming: false, status: undefined, blocks: [{ type: "notice", tone: "warning", title, content }] })

      const ctrl = new AbortController()
      abortRef.current = ctrl
      let res: Response
      try {
        res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: [...history.filter((h) => h.content), { role: "user", content: q }], mode }),
          signal: ctrl.signal,
        })
      } catch {
        if (!ctrl.signal.aborted) fail("连不上服务器", "请检查网络后再试一次。")
        return
      }
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        fail("没有拿到回答", err.error ?? `服务器返回 ${res.status}`)
        return
      }

      let state: CairnTurnState = emptyTurn()
      let buf = ""
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      try {
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const { events, rest } = parseSse(buf)
          buf = rest
          if (!events.length) continue
          for (const e of events) state = applyEvent(state, e.event, e.data)
          update({
            status: state.sources.length && !state.text ? `找到 ${state.sources.length} 份资料，正在组织回答…` : undefined,
            blocks: toBlocks(state, mode),
          })
        }
      } catch {
        if (ctrl.signal.aborted) return
        state = { ...state, error: state.error ?? "连接中断了", finished: true }
      }
      // 流结束时缓冲里可能还剩最后一个没以空行收尾的事件（例如 error）：补一个空行再解析一次
      if (buf.trim()) for (const e of parseSse(buf + "\n\n").events) state = applyEvent(state, e.event, e.data)
      // 流结束却没收到 done：按“没写完”处理，不当成完整回答
      if (!state.finished) state = { ...state, complete: false, finished: true }
      update({ streaming: false, status: undefined, blocks: toBlocks(state, mode) })
      abortRef.current = null
    },
    [busy, messages],
  )

  return { messages, send, stop, busy, reset: () => (stop(), setMessages([])) }
}
