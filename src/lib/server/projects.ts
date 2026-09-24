import { PROJECT_SEED } from "@/lib/projects/seed"
import { MEMBER_ROLES, type MemberRole, type Project, type ProjectAccess, type ProjectLocation, type ProjectMember } from "@/lib/projects/types"
import { findMember, isAdmin } from "./members"

/**
 * 项目（服务端）。演示版存内存，上线换数据库。
 * 权限（三档 + 管理员）：
 * - 看：成员（任何角色）、管理员
 * - 编辑内容（指标、依据清单、标注、文件）：负责人、可编辑成员、管理员
 * - 管理项目（名称、类型、阶段、位置、成员及其权限）：负责人、管理员
 */
const g = globalThis as unknown as { __projects?: Map<string, Project> }
const store = (g.__projects ??= new Map(PROJECT_SEED.map((p) => [p.id, structuredClone(p)])))

export function listProjectsFor(email: string): Project[] {
  const admin = isAdmin(email)
  return [...store.values()].filter((p) => admin || p.members.some((m) => m.email === email))
}

export function getProject(id: string) {
  return store.get(id)
}

export function canView(p: Project, email: string) {
  return isAdmin(email) || p.members.some((m) => m.email === email)
}

export function roleIn(p: Project, email: string): MemberRole | null {
  return p.members.find((m) => m.email === email)?.role ?? null
}

export function canEditContent(p: Project, email: string) {
  const r = roleIn(p, email)
  return isAdmin(email) || r === "lead" || r === "editor"
}

export function canManage(p: Project, email: string) {
  return isAdmin(email) || roleIn(p, email) === "lead"
}

/** 给前端用的权限摘要（界面据此隐藏按钮；接口仍会再校验一次） */
export function accessOf(p: Project, email: string): ProjectAccess {
  return {
    role: roleIn(p, email),
    admin: isAdmin(email),
    canEdit: canEditContent(p, email),
    canManage: canManage(p, email),
  }
}

/** 这次修改需要哪一级权限：只改指标 → 编辑；其他（位置、阶段、成员…）→ 管理 */
export function patchNeeds(patch: ProjectPatch): "edit" | "manage" {
  const keys = Object.keys(patch).filter((k) => patch[k as keyof ProjectPatch] !== undefined)
  return keys.every((k) => k === "metrics") ? "edit" : "manage"
}

export type ProjectPatch = Partial<Pick<Project, "name" | "type" | "stage" | "metrics">> & {
  location?: Partial<ProjectLocation>
  members?: ProjectMember[]
}

export function updateProject(id: string, patch: ProjectPatch): { ok: true; project: Project } | { ok: false; error: string } {
  const p = store.get(id)
  if (!p) return { ok: false, error: "项目不存在" }
  if (patch.members) {
    if (patch.members.some((m) => !MEMBER_ROLES[m.role])) return { ok: false, error: "角色不正确" }
    if (!patch.members.some((m) => m.role === "lead")) return { ok: false, error: "项目至少要有一位负责人" }
    const unknown = patch.members.find((m) => !findMember(m.email))
    if (unknown) return { ok: false, error: `${unknown.email} 不在单位成员名单里，请先请管理员邀请` }
  }
  const next: Project = {
    ...p,
    name: patch.name?.trim() || p.name,
    type: patch.type ?? p.type,
    stage: patch.stage ?? p.stage,
    location: { ...p.location, ...patch.location },
    metrics: patch.metrics ? { ...p.metrics, ...patch.metrics } : p.metrics,
    members: patch.members
      ? Array.from(new Map(patch.members.map((m) => [m.email, m])).values())
      : p.members,
  }
  store.set(id, next)
  return { ok: true, project: next }
}
