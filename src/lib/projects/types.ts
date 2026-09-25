import type { AccessLevel } from "@/lib/access"

/**
 * 项目：以项目为单位检索、存依据、做核对。
 *
 * 位置细到区：录入后，国家 / 省市 / 区三级的要求自动匹配出来（见 regional.ts）。
 * 规划条件（限值）+ 设计指标（本项目的数）→ 机械核对（见 checks.ts）。
 * 注意定位：平台只做“辅助”，核对结果和引用都要由本人确认，不代替审查。
 */
export interface ProjectLocation {
  province: string
  city: string
  district: string
  /** 详细位置，如路名、地块编号 */
  address: string
  /** 经纬度：日照、风环境等分析工具会用到 */
  lat?: number
  lng?: number
}

/**
 * 项目角色（三档）：
 * - lead   负责人：管理项目（位置、阶段、成员及每个人的权限）+ 编辑内容
 * - editor 可编辑：浏览 + 编辑内容（指标、依据清单、标注、项目文件）
 * - viewer 仅浏览：只能看和下载
 * 管理员不必是成员，也拥有全部权限。
 */
export type MemberRole = "lead" | "editor" | "viewer"

export const MEMBER_ROLES: Record<MemberRole, { label: string; desc: string; access: AccessLevel }> = {
  lead: { label: "负责人", desc: "管理项目和成员权限", access: "edit" },
  editor: { label: "可编辑", desc: "浏览 + 编辑内容", access: "edit" },
  viewer: { label: "仅浏览", desc: "只能查看、下载", access: "view" },
}
/** 当前用户在某个项目里的权限摘要（服务端算好交给界面；接口仍会再校验） */
export interface ProjectAccess {
  role: MemberRole | null
  admin: boolean
  /** 编辑内容：指标、依据清单、标注、文件 */
  canEdit: boolean
  /** 管理项目：位置、阶段、成员及其权限；归档 / 恢复 */
  canManage: boolean
  archived: boolean
}

export const MEMBER_ROLE_ORDER: MemberRole[] = ["lead", "editor", "viewer"]

export interface ProjectMember {
  email: string
  role: MemberRole
}

/** 规划条件里的一条限值，例如“容积率 ≤ 2.5” */
export interface Condition {
  key: string
  label: string
  op: "<=" | ">=" | "="
  value: number
  unit?: string
  /** 出处，例如“规划条件通知书（示例）” */
  source: string
}

export interface Project {
  id: string
  name: string
  type: string
  stage: string
  location: ProjectLocation
  members: ProjectMember[]
  conditions: Condition[]
  /** 本项目当前的设计指标（key 对应 conditions.key） */
  metrics: Record<string, number | undefined>
  createdBy?: string
  createdAt?: number
  /** 已定：项目不能删除，只能归档。归档后只读保留，可以恢复 */
  archivedAt?: number
  archivedBy?: string
}

export const STAGES = ["方案", "初设", "施工图", "施工配合"]
export const TYPES = ["住宅", "学校", "办公", "商业", "医院", "其他"]
