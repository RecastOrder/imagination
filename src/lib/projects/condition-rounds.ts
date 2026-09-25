import type { Condition } from "./types"

/**
 * 规划条件的“轮次”（已定）：每次确认保存算一轮，每一轮都永久保留。
 * 这样能回答“谁在什么时候、依据什么，把限高从 60 改成了 80”。
 */
export interface ConditionRound {
  id: string
  projectId: string
  /** 第几轮，从 1 开始 */
  round: number
  conditions: Condition[]
  savedBy: string
  savedByName: string
  savedAt: number
  /** 这一轮的依据，如“规划条件调整函（2026-10）” */
  note?: string
}

export type ConditionChange =
  | { kind: "added"; label: string; after: Condition }
  | { kind: "removed"; label: string; before: Condition }
  | { kind: "changed"; label: string; before: Condition; after: Condition }

const same = (a: Condition, b: Condition) => a.op === b.op && a.value === b.value && (a.unit ?? "") === (b.unit ?? "")

/** 这一轮和上一轮比：新增 / 删除 / 修改了哪些条件（按名称对应） */
export function diffConditions(before: Condition[], after: Condition[]): ConditionChange[] {
  const out: ConditionChange[] = []
  for (const a of after) {
    const b = before.find((x) => x.label === a.label)
    if (!b) out.push({ kind: "added", label: a.label, after: a })
    else if (!same(a, b)) out.push({ kind: "changed", label: a.label, before: b, after: a })
  }
  for (const b of before) if (!after.some((a) => a.label === b.label)) out.push({ kind: "removed", label: b.label, before: b })
  return out
}

export const fmtCondition = (c: Condition) => `${c.op === "<=" ? "≤" : c.op === ">=" ? "≥" : "="} ${c.value}${c.unit ?? ""}`
