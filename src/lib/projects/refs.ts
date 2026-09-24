import { createLocalStore } from "@/lib/local-store"

/**
 * 项目依据清单：在对话、阅读、预览时看到有用的内容，一键“加入项目”。
 * 只是“收集和分类”，不做审核：是否采用由项目成员自己判断。
 * 演示阶段存在浏览器本地；上线后存服务器，项目成员共享。
 */
export const REF_CATEGORIES = ["规范依据", "地方要求", "案例参考", "甲方要求", "会议决定", "待确认"] as const
export type RefCategory = (typeof REF_CATEGORIES)[number]

export interface ProjectRef {
  id: string
  projectId: string
  category: RefCategory
  title: string
  /** 摘录的原文 / 回答正文 */
  text?: string
  sourceId?: string
  sectionId?: string
  note?: string
  addedBy: string
  addedAt: number
}

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

export const projectRefsStore = createLocalStore<ProjectRef[]>("proj:refs", SEED)
export const lastProjectPref = createLocalStore<string>("proj:last", "housing")

let seq = 0
export function addProjectRef(r: Omit<ProjectRef, "id" | "addedAt">) {
  const ref: ProjectRef = { ...r, id: `pr${Date.now().toString(36)}${seq++}`, addedAt: Date.now() }
  projectRefsStore.write((l) => [ref, ...l])
  lastProjectPref.write(r.projectId)
  return ref
}

export function removeProjectRef(id: string) {
  projectRefsStore.write((l) => l.filter((r) => r.id !== id))
}
