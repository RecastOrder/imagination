import type { Condition, Project } from "./types"

/**
 * 机械核对：把本项目的设计指标和规划条件逐条比较。
 * 这是“辅助核对”——只做数字比较，不理解图纸，也不代替审查，结论需要本人确认。
 */
export type CheckStatus = "pass" | "fail" | "missing"

export interface CheckRow {
  condition: Condition
  value?: number
  status: CheckStatus
  /** 差多少，例如“超出 2.4 m” */
  gap?: string
}

export function runChecks(p: Project): CheckRow[] {
  return p.conditions.map((c) => {
    const v = p.metrics[c.key]
    if (v === undefined || v === null || Number.isNaN(v)) return { condition: c, status: "missing" }
    const ok = c.op === "<=" ? v <= c.value : c.op === ">=" ? v >= c.value : v === c.value
    const diff = Math.abs(v - c.value)
    const unit = c.unit ?? ""
    return {
      condition: c,
      value: v,
      status: ok ? "pass" : "fail",
      gap: ok ? undefined : `${c.op === "<=" ? "超出" : "不足"} ${Number(diff.toFixed(2))}${unit}`,
    }
  })
}
