import type { ChatMode } from "./modes"
import type { Block } from "./types"

/**
 * Cairn 知识库对话 → 本平台的 Block 列表（Cairn-Specs 105）。
 *
 * Cairn 的 /api/svc/chat/stream 用 SSE 发四种事件：
 *   sources（先到一次）· delta（逐段文字）· done（结束，带 complete / grounded）· error
 * 这里只做纯函数转换：解析事件、把回答里的 [资料标题] 换成 [n] 引用、拼出 Block 列表。
 * 界面组件不关心数据来自 Cairn 还是演示。
 */

export interface CairnSource {
  title: string
  /** 资料库里的资料卡 id；知识库里有这份文档但资料库没有对应卡片时为 null */
  card_id: string | null
  excerpt?: string
  url?: string
}

export interface CairnTurnState {
  sources: CairnSource[]
  text: string
  grounded?: boolean
  complete?: boolean
  error?: string
  finished: boolean
}

export const emptyTurn = (): CairnTurnState => ({ sources: [], text: "", finished: false })

/** 把一段 SSE 文本切成完整的事件；返回事件和剩下还不完整的尾巴 */
export function parseSse(buffer: string): { events: { event: string; data: unknown }[]; rest: string } {
  const events: { event: string; data: unknown }[] = []
  const blocks = buffer.split("\n\n")
  const rest = blocks.pop() ?? ""
  for (const block of blocks) {
    let event = "message"
    const data: string[] = []
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim()
      else if (line.startsWith("data:")) data.push(line.slice(5).trim())
    }
    if (!data.length) continue
    try {
      events.push({ event, data: JSON.parse(data.join("\n")) })
    } catch {
      // 半截 JSON 不会出现在完整事件里；真坏了就跳过这一条，不中断整段回答
    }
  }
  return { events, rest }
}

export function applyEvent(state: CairnTurnState, event: string, data: unknown): CairnTurnState {
  const d = (data ?? {}) as Record<string, unknown>
  switch (event) {
    case "sources":
      return { ...state, sources: (d.sources as CairnSource[]) ?? [], grounded: Boolean(d.grounded) }
    case "delta":
      return { ...state, text: state.text + String(d.text ?? "") }
    case "done":
      return { ...state, grounded: Boolean(d.grounded), complete: d.complete !== false, finished: true }
    case "error":
      return { ...state, error: String(d.message ?? "回答失败"), text: String(d.text ?? state.text), finished: true }
    default:
      return state
  }
}

const norm = (s: string) => s.replace(/[\s《》〈〉「」“”"'（）()：:·._\-—]/g, "").toLowerCase()
/** 规范编号，如 GB 50016-2014、DGJ32/J67-2008、JGJ 3 */
const CODE_RE = /[A-Z]{1,5}(?:\/T)?\s?\d{1,6}(?:[.\-－]\d{1,5})*/g
const codesOf = (s: string) => (s.toUpperCase().match(CODE_RE) ?? []).map((c) => c.replace(/\s/g, ""))

/** 回答里一个 [方括号] 指的是第几份资料（0 起），认不出返回 -1 */
export function matchSource(bracket: string, sources: CairnSource[]): number {
  const b = norm(bracket)
  if (!b || /^\d+$/.test(b)) return -1
  const exact = sources.findIndex((s) => {
    const t = norm(s.title)
    return t && (t.includes(b) || b.includes(t))
  })
  if (exact >= 0) return exact
  const bc = codesOf(bracket)
  if (!bc.length) return -1
  return sources.findIndex((s) => codesOf(s.title).some((c) => bc.some((x) => x.startsWith(c) || c.startsWith(x))))
}

/** [资料标题 §条] → [n]；n 是它在 sources 里的顺序（1 起）。认不出的方括号原样保留 */
export function linkCitations(text: string, sources: CairnSource[]): string {
  return text.replace(/\[([^\[\]\n]{2,160})\]/g, (whole, inner: string) => {
    const i = matchSource(inner, sources)
    return i >= 0 ? `[${i + 1}]` : whole
  })
}

export function toBlocks(state: CairnTurnState, mode: ChatMode): Block[] {
  const blocks: Block[] = []
  const ids = state.sources.map((s) => s.card_id ?? "")
  if (state.text) {
    // citations 按编号对齐：没有资料卡的那几条留空串，文字里的 [n] 就不会变成可点的按钮
    blocks.push({ type: "text", content: linkCitations(state.text, state.sources), citations: ids })
  }
  if (!state.finished) return blocks

  if (state.error) {
    blocks.push({ type: "notice", tone: "warning", title: "回答没有完成", content: state.error })
  } else if (state.complete === false) {
    blocks.push({
      type: "notice",
      tone: "warning",
      title: "回答被截断了",
      content: "这段回答没有写完（模型输出到了长度上限）。可以缩小问题范围再问一次。",
    })
  }
  if (!state.sources.length || state.grounded === false) {
    blocks.push({
      type: "notice",
      tone: "warning",
      title: "没有找到出处",
      content: "知识库里没有检索到与这个问题相关的资料，上面的内容不能作为依据。",
    })
  }

  const mapped = ids.filter(Boolean)
  if (mapped.length) blocks.push({ type: "sources", sourceIds: Array.from(new Set(mapped)) })
  const unmapped = state.sources.filter((s) => !s.card_id)
  if (unmapped.length) {
    blocks.push({
      type: "notice",
      tone: "info",
      title: `另有 ${unmapped.length} 条引用在资料库里还没有对应的资料卡`,
      content: unmapped.map((s) => `· ${s.title}`).join("\n"),
    })
  }

  blocks.push(
    mode === "rigorous"
      ? {
          type: "notice",
          tone: "info",
          title: "严谨模式还差一道核对",
          content:
            "回答里的数字还没有逐字对照原文核对（这一步尚未实现）。用于设计或送审前，请点开引用核对条文原文。",
        }
      : {
          type: "notice",
          tone: "info",
          title: "发散模式暂时和严谨模式用同一套回答",
          content: "联想内容还没有单独标出。回答仍基于检索到的资料，结论请以原文为准。",
        },
  )
  return blocks
}
