import { PROJECT_SEED } from "@/lib/projects/seed"
import type { Project, ProjectLocation, ProjectMember } from "@/lib/projects/types"
import { findMember, isAdmin } from "./members"

/**
 * 项目（服务端）。演示版存内存，上线换数据库。
 * 权限：项目成员能看；项目负责人和管理员能改（位置、指标、成员）。
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

export function canEdit(p: Project, email: string) {
  return isAdmin(email) || p.members.some((m) => m.email === email && m.role === "lead")
}

export type ProjectPatch = Partial<Pick<Project, "name" | "type" | "stage" | "metrics">> & {
  location?: Partial<ProjectLocation>
  members?: ProjectMember[]
}

export function updateProject(id: string, patch: ProjectPatch): { ok: true; project: Project } | { ok: false; error: string } {
  const p = store.get(id)
  if (!p) return { ok: false, error: "项目不存在" }
  if (patch.members) {
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
