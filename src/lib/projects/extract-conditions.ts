import type { Condition } from "./types"

/**
 * 从规划条件通知书的文字里找出常见指标（不依赖 AI，按关键词 + 数字规则匹配）。
 * 只是“候选”：每一条都带原文片段，必须由本人对照原文确认后才会保存。
 * 识别不到的（扫描件、写法特殊）请手动录入；接入 AI 后可以识别更多写法。
 */
export interface ConditionCandidate extends Condition {
  /** 原文片段：让人对照核对 */
  snippet: string
}

const INDICATORS: { key: string; label: string; names: string[]; op: Condition["op"]; unit?: string }[] = [
  { key: "far", label: "容积率", names: ["容积率"], op: "<=" },
  { key: "coverage", label: "建筑密度", names: ["建筑密度"], op: "<=", unit: "%" },
  { key: "green", label: "绿地率", names: ["绿地率"], op: ">=", unit: "%" },
  { key: "height", label: "建筑高度", names: ["建筑高度", "建筑限高", "限高"], op: "<=", unit: "m" },
  { key: "parking", label: "机动车停车位", names: ["机动车停车位", "机动车位", "机动车泊位"], op: ">=", unit: "个" },
  { key: "bike", label: "非机动车停车位", names: ["非机动车停车位", "非机动车位"], op: ">=", unit: "个" },
]

const LE = /(不大于|不超过|不高于|不得大于|不得超过|小于等于|≤|<=|＜=|以下|以内|最大)/
const GE = /(不小于|不低于|不少于|不得小于|不得少于|大于等于|≥|>=|＞=|以上|至少|最小)/

/** 全角数字、符号转成半角，便于匹配 */
function normalize(text: string) {
  return text
    .replace(/[０-９．％]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, " ")
}

export function extractConditions(raw: string, source = "规划条件通知书（自动识别）"): ConditionCandidate[] {
  const text = normalize(raw)
  const out: ConditionCandidate[] = []
  for (const ind of INDICATORS) {
    for (const name of ind.names) {
      // “非机动车停车位”里也含“机动车停车位”：前面紧挨着“非”的跳过
      const re = new RegExp(`(^|[^非])${name}[^0-9。；;\\n]{0,16}?([0-9]+(?:\\.[0-9]+)?)\\s*(%|米|m|个|辆)?`, "g")
      const m = re.exec(text)
      if (!m) continue
      const start = m.index + m[1].length
      const phrase = text.slice(start, m.index + m[0].length)
      const value = Number(m[2])
      if (!Number.isFinite(value)) continue
      const op: Condition["op"] = LE.test(phrase) ? "<=" : GE.test(phrase) ? ">=" : ind.op
      out.push({
        key: ind.key,
        label: ind.label,
        op,
        value,
        unit: ind.unit,
        source,
        snippet: clause(text, start, m.index + m[0].length),
      })
      break
    }
  }
  return out
}

/** 原文片段：从指标名开始，到这一句结束（；。）为止 */
function clause(text: string, start: number, matchEnd: number) {
  const rest = text.slice(matchEnd)
  const stop = rest.search(/[；;。\n]/)
  const end = matchEnd + (stop === -1 ? Math.min(rest.length, 20) : Math.min(stop + 1, 30))
  return text.slice(start, end).trim()
}
