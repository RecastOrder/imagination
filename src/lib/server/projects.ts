import { PROJECT_SEED } from "@/lib/projects/seed"
import { LOCATIONS } from "@/lib/projects/regional"
import { MEMBER_ROLES, STAGES, TYPES, type MemberRole, type Project, type Condition, type ProjectAccess, type ProjectLocation, type ProjectMember } from "@/lib/projects/types"
import { collection } from "./db"
import { DEMO_DATA } from "./env"
import { findMember, isAdmin } from "./members"

/**
 * 项目（服务端），存在数据库里（db.ts）。
 * 权限（三档 + 管理员）：
 * - 看：成员（任何角色）、管理员
 * - 编辑内容（指标、依据清单、标注、文件）：负责人、可编辑成员、管理员
 * - 管理项目（名称、类型、阶段、位置、成员及其权限）：负责人、管理员
 */
const store = collection<Project>("projects", () => (DEMO_DATA ? PROJECT_SEED.map((p) => [p.id, structuredClone(p)]) : []))

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

/** 归档的项目只读：谁都不能改内容（恢复后再改） */
export function canEditContent(p: Project, email: string) {
  if (p.archivedAt) return false
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
    archived: !!p.archivedAt,
  }
}

/** 这次修改需要哪一级权限：只改指标 / 规划条件 → 编辑；其他（位置、阶段、成员、归档…）→ 管理 */
export function patchNeeds(patch: ProjectPatch): "edit" | "manage" {
  const keys = Object.keys(patch).filter((k) => patch[k as keyof ProjectPatch] !== undefined)
  return keys.every((k) => k === "metrics" || k === "conditions" || k === "conditionsNote") ? "edit" : "manage"
}

/** 规划条件：逐条检查格式，key 不能重复 */
function cleanConditions(list: unknown): { ok: true; conditions: Condition[] } | { ok: false; error: string } {
  if (!Array.isArray(list) || list.length > 50) return { ok: false, error: "规划条件格式不正确" }
  const out: Condition[] = []
  for (const raw of list) {
    const c = raw as Condition
    const label = typeof c?.label === "string" ? c.label.trim().slice(0, 30) : ""
    if (!label) return { ok: false, error: "每条规划条件都要有名称" }
    if (!["<=", ">=", "="].includes(c.op)) return { ok: false, error: `「${label}」的比较方式不正确` }
    if (typeof c.value !== "number" || !Number.isFinite(c.value)) return { ok: false, error: `「${label}」的限值要填数字` }
    const key = typeof c.key === "string" && c.key.trim() ? c.key.trim().slice(0, 40) : `c${out.length + 1}`
    if (out.some((x) => x.key === key)) return { ok: false, error: `「${label}」重复了` }
    out.push({
      key,
      label,
      op: c.op,
      value: c.value,
      unit: typeof c.unit === "string" && c.unit.trim() ? c.unit.trim().slice(0, 10) : undefined,
      source: typeof c.source === "string" && c.source.trim() ? c.source.trim().slice(0, 80) : "手动录入",
    })
  }
  return { ok: true, conditions: out }
}

export interface NewProjectInput {
  name: string
  type: string
  stage: string
  location: ProjectLocation
  /** 项目负责人（默认发起人自己） */
  lead?: string
}

/**
 * 新建项目：调用方先确认发起人有“新建项目”权限。
 * 负责人默认是发起人；指定别人当负责人时，发起人（非管理员）自动作为“可编辑”成员加入。
 */
export function createProject(input: NewProjectInput, creator: string): { ok: true; project: Project } | { ok: false; error: string } {
  const name = String(input.name ?? "").trim().slice(0, 60)
  if (!name) return { ok: false, error: "请填写项目名称" }
  if (!TYPES.includes(input.type)) return { ok: false, error: "项目类型不正确" }
  if (!STAGES.includes(input.stage)) return { ok: false, error: "项目阶段不正确" }
  const loc = input.location ?? ({} as ProjectLocation)
  if (!LOCATIONS[loc.province]?.[loc.city]?.includes(loc.district)) return { ok: false, error: "请选择项目所在的区" }
  const lead = input.lead || creator
  const leadMember = findMember(lead)
  if (!leadMember || leadMember.status === "disabled") return { ok: false, error: "负责人不在单位成员名单里，或账号已停用" }
  if ([...store.values()].some((p) => p.name === name)) return { ok: false, error: "已经有同名项目了，换个名称以便区分" }
  const members: ProjectMember[] = [{ email: lead, role: "lead" }]
  if (lead !== creator && !isAdmin(creator)) members.push({ email: creator, role: "editor" })
  const project: Project = {
    id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    name,
    type: input.type,
    stage: input.stage,
    location: {
      province: loc.province,
      city: loc.city,
      district: loc.district,
      address: String(loc.address ?? "").trim().slice(0, 120),
    },
    members,
    conditions: [],
    metrics: {},
    createdBy: creator,
    createdAt: Date.now(),
  }
  store.set(project.id, project)
  return { ok: true, project }
}

export type ProjectPatch = Partial<Pick<Project, "name" | "type" | "stage" | "metrics" | "conditions">> & {
  /** true = 归档，false = 恢复（只有负责人 / 管理员） */
  archived?: boolean
  /** 保存规划条件时，这一轮的依据（写进历史） */
  conditionsNote?: string
  location?: Partial<ProjectLocation>
  members?: ProjectMember[]
}

export function updateProject(id: string, patch: ProjectPatch, actor: string): { ok: true; project: Project } | { ok: false; error: string } {
  const p = store.get(id)
  if (!p) return { ok: false, error: "项目不存在" }
  if (p.archivedAt && Object.keys(patch).some((k) => k !== "archived")) return { ok: false, error: "项目已归档（只读）。需要修改请先恢复" }
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
  if (patch.conditions) {
    const c = cleanConditions(patch.conditions)
    if (!c.ok) return c
    next.conditions = c.conditions
  }
  if (patch.archived === true && !p.archivedAt) Object.assign(next, { archivedAt: Date.now(), archivedBy: actor })
  if (patch.archived === false) Object.assign(next, { archivedAt: undefined, archivedBy: undefined })
  store.set(id, next)
  return { ok: true, project: next }
}
