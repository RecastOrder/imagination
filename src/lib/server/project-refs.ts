import { REF_CATEGORIES, type NewProjectRef, type ProjectRef } from "@/lib/projects/refs"
import { collection } from "./db"
import { DEMO_DATA } from "./env"

/** 项目依据清单（服务端）：项目成员共享。能不能读写由调用方按项目权限先判断 */
const now = Date.UTC(2026, 8, 21)

const SEED: ProjectRef[] = [
  {
    id: "pr1",
    projectId: "housing",
    category: "规范依据",
    title: "住宅设计规范 · 5 套内空间",
    sourceId: "gb50096-2011",
    sectionId: "s1",
    note: "卧室开间按此核对",
    addedBy: "li.na@studio.cn",
    addedAt: now,
  },
  {
    id: "pr2",
    projectId: "housing",
    category: "地方要求",
    title: "上海市住宅设计标准 · 日照与间距",
    sourceId: "dgj08-sh-housing",
    sectionId: "s2",
    addedBy: "zhang.ming@studio.cn",
    addedAt: now + 3600_000,
  },
  {
    id: "pr3",
    projectId: "housing",
    category: "会议决定",
    title: "南侧沿街做退台",
    text: "甲方确认南侧退台方案方向，要求复核后排楼底层日照。",
    addedBy: "zhang.ming@studio.cn",
    addedAt: now + 7200_000,
  },
]

const store = collection<ProjectRef>("project_refs", () => (DEMO_DATA ? SEED.map((r) => [r.id, r]) : []))

export function listRefs(projectId: string): ProjectRef[] {
  return store
    .values()
    .filter((r) => r.projectId === projectId)
    .sort((a, b) => b.addedAt - a.addedAt)
}

export function addRef(projectId: string, input: NewProjectRef, addedBy: string): { ok: true; ref: ProjectRef } | { ok: false; error: string } {
  const title = String(input.title ?? "").trim().slice(0, 200)
  if (!title) return { ok: false, error: "标题不能为空" }
  if (!REF_CATEGORIES.includes(input.category)) return { ok: false, error: "分类不正确" }
  const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined)
  const ref: ProjectRef = {
    id: `pr${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    projectId,
    category: input.category,
    title,
    text: str(input.text, 4000),
    sourceId: str(input.sourceId, 100),
    sectionId: str(input.sectionId, 100),
    note: str(input.note, 500),
    addedBy,
    addedAt: Date.now(),
  }
  store.set(ref.id, ref)
  return { ok: true, ref }
}

export function removeRef(projectId: string, refId: string) {
  const r = store.get(refId)
  if (!r || r.projectId !== projectId) return false
  return store.delete(refId)
}
