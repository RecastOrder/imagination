/**
 * 规范变更：被替代时，必须说清楚“改了什么”和“影响到哪里”。
 * 【示例数据】新版编号与条文变化均为虚构，仅用于演示界面。
 */
export interface ClauseChange {
  clause: string
  change: "修改" | "新增" | "删除"
  summary: string
}

export interface StandardChange {
  sourceId: string
  replacedBy: string
  effective: string
  clauses: ClauseChange[]
}

export const STANDARD_CHANGES: StandardChange[] = [
  {
    sourceId: "gb50096-2011",
    replacedBy: "住宅设计规范（新版，示例编号）",
    effective: "2026-10-01（示例）",
    clauses: [
      { clause: "5 套内空间", change: "修改", summary: "卧室、起居室最小使用面积调整（示例）" },
      { clause: "7 室内环境", change: "修改", summary: "日照、采光要求表述调整（示例）" },
      { clause: "新增一节", change: "新增", summary: "适老化与无障碍套型要求（示例）" },
    ],
  },
]

export function changeFor(sourceId: string) {
  return STANDARD_CHANGES.find((c) => c.sourceId === sourceId)
}
