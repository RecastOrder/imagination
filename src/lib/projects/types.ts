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

export type MemberRole = "lead" | "member"

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
}

export const STAGES = ["方案", "初设", "施工图", "施工配合"]
export const TYPES = ["住宅", "学校", "办公", "商业", "医院", "其他"]
