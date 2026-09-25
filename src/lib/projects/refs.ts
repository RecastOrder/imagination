import { createLocalStore } from "@/lib/local-store"

/**
 * 项目依据清单：在对话、阅读、预览时看到有用的内容，一键“加入项目”。
 * 只是“收集和分类”，不做审核：是否采用由项目成员自己判断。
 * 存在服务器（src/lib/server/project-refs.ts），项目成员共享；读写都经过 /api/projects/[id]/refs。
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

/** 上次加入的是哪个项目（只是这台设备上的便利记忆，不是账户偏好） */
export const lastProjectPref = createLocalStore<string>("proj:last", "housing")

export type NewProjectRef = Pick<ProjectRef, "category" | "title" | "text" | "sourceId" | "sectionId" | "note">

/** 加入依据清单（浏览器端调用接口；服务端校验编辑权限） */
export async function addProjectRef(projectId: string, r: NewProjectRef): Promise<ProjectRef> {
  const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/refs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(r),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "加入失败")
  lastProjectPref.write(projectId)
  return data
}

export async function removeProjectRef(projectId: string, refId: string) {
  const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/refs?refId=${encodeURIComponent(refId)}`, { method: "DELETE" })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "删除失败")
}
