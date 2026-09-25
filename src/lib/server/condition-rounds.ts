import type { ConditionRound } from "@/lib/projects/condition-rounds"
import type { Condition, Project } from "@/lib/projects/types"
import { collection } from "./db"
import { findMember } from "./members"

/** 规划条件的历史轮次（只增不改，永久保留） */
const store = collection<ConditionRound>("condition_rounds")

export function listRounds(p: Project): ConditionRound[] {
  const rounds = store
    .values()
    .filter((r) => r.projectId === p.id)
    .sort((a, b) => a.round - b.round)
  // 在“轮次”功能之前就有的条件（示例数据）：算作第 1 轮
  if (rounds.length === 0 && p.conditions.length > 0) {
    return [
      {
        id: `${p.id}-r0`,
        projectId: p.id,
        round: 1,
        conditions: p.conditions,
        savedBy: p.createdBy ?? "",
        savedByName: p.createdBy ? (findMember(p.createdBy)?.name ?? p.createdBy) : "示例数据",
        savedAt: p.createdAt ?? 0,
        note: "初始录入",
      },
    ]
  }
  return rounds
}

/**
 * 修改规划条件之前调用（传入修改前的项目）：把“初始录入”存成正式的第 1 轮，
 * 否则第 1 轮会被误算成修改后的内容，看不出改了什么。
 */
export function ensureBaselineRound(before: Project) {
  const existing = listRounds(before)
  if (existing.length === 1 && existing[0].id === `${before.id}-r0`) store.set(existing[0].id, existing[0])
}

export function addRound(p: Project, conditions: Condition[], by: string, note?: string): ConditionRound {
  const existing = listRounds(p)
  const r: ConditionRound = {
    id: `cr${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    projectId: p.id,
    round: (existing.at(-1)?.round ?? 0) + 1,
    conditions,
    savedBy: by,
    savedByName: findMember(by)?.name ?? by.split("@")[0],
    savedAt: Date.now(),
    note: note?.trim().slice(0, 120) || undefined,
  }
  store.set(r.id, r)
  return r
}
