import {
  BookMarkedIcon,
  BoxesIcon,
  DownloadIcon,
  FolderPlusIcon,
  LibraryIcon,
  MessageSquareIcon,
  SettingsIcon,
  UploadCloudIcon,
  type LucideIcon,
} from "lucide-react"

import type { SourceKind } from "@/lib/sources/types"

/**
 * 权限 = 三个维度：
 *   1. 功能：能用哪些模块
 *   2. 资料范围：能看哪些资料集合
 *   3. 配额：存储空间、每月 AI 次数
 * 管理方式 = 角色模板 + 个人单独调整（只记录“和模板不同的地方”）。
 * ⚠️ 界面上的隐藏只是体验，真正的权限判断必须在服务端再做一次。
 */

export type Feature = "chat" | "library" | "notebook" | "upload" | "tool_gh" | "project_create" | "original_download" | "admin"

export const FEATURES: Record<Feature, { label: string; desc: string; icon: LucideIcon }> = {
  chat: { label: "AI 对话", desc: "在对话中提问、生成回答", icon: MessageSquareIcon },
  library: { label: "资料库", desc: "检索和阅读资料", icon: LibraryIcon },
  notebook: { label: "笔记本", desc: "摘录、批注、按项目整理", icon: BookMarkedIcon },
  upload: { label: "上传与云盘", desc: "上传文件、从网盘导入", icon: UploadCloudIcon },
  tool_gh: { label: "GH 生成器", desc: "生成 Grasshopper 文件", icon: BoxesIcon },
  /** 已定：管理员 + 管理员指定的人可以新建项目（在“成员与权限”里单独打开） */
  project_create: { label: "新建项目", desc: "发起新项目，并指定项目负责人", icon: FolderPlusIcon },
  /** owner 2026-09-26「原件可以有下载打印的选项，但是需要给权限，暂时不开放给user」⇒ 只在管理员模板里，其他人由管理员单独打开 */
  original_download: { label: "原件下载与打印", desc: "把资料库里规范、图集的原件下载到本机或打印", icon: DownloadIcon },
  admin: { label: "成员管理", desc: "管理成员、角色和配额", icon: SettingsIcon },
}
export const FEATURE_ORDER: Feature[] = ["chat", "library", "notebook", "upload", "tool_gh", "project_create", "original_download", "admin"]

export type Collection = "standards" | "atlas" | "journals" | "cases"

export const COLLECTIONS: Record<Collection, { label: string; kinds: SourceKind[] }> = {
  standards: { label: "规范规章", kinds: ["standard"] },
  atlas: { label: "图集", kinds: ["atlas"] },
  journals: { label: "期刊 · 论文 · 书籍", kinds: ["magazine", "article", "book"] },
  cases: { label: "案例 · 报道", kinds: ["report"] },
}
export const COLLECTION_ORDER: Collection[] = ["standards", "atlas", "journals", "cases"]

export interface Quota {
  storageGB: number
  aiPerMonth: number
}

export type RoleId = "admin" | "standard" | "tool_user" | "reader" | "guest"

export interface RoleTemplate {
  id: RoleId
  label: string
  desc: string
  features: Feature[]
  collections: Collection[]
  quota: Quota
}

const ALL_COLLECTIONS = COLLECTION_ORDER

export const ROLES: Record<RoleId, RoleTemplate> = {
  admin: {
    id: "admin",
    label: "管理员",
    desc: "全部功能，并可管理成员",
    features: FEATURE_ORDER,
    collections: ALL_COLLECTIONS,
    quota: { storageGB: 200, aiPerMonth: 5000 },
  },
  standard: {
    id: "standard",
    label: "标准成员",
    desc: "日常工作所需的全部功能",
    features: ["chat", "library", "notebook", "upload", "tool_gh"],
    collections: ALL_COLLECTIONS,
    quota: { storageGB: 50, aiPerMonth: 1500 },
  },
  tool_user: {
    id: "tool_user",
    label: "工具用户",
    desc: "只使用 GH 生成器等工具",
    features: ["tool_gh"],
    collections: [],
    quota: { storageGB: 5, aiPerMonth: 200 },
  },
  reader: {
    id: "reader",
    label: "阅读用户",
    desc: "查阅指定资料并做笔记",
    features: ["library", "notebook"],
    collections: ["standards", "atlas"],
    quota: { storageGB: 2, aiPerMonth: 0 },
  },
  guest: {
    id: "guest",
    label: "访客",
    desc: "只能看公开资料的摘要",
    features: [],
    collections: [],
    quota: { storageGB: 0, aiPerMonth: 0 },
  },
}
export const ROLE_ORDER: RoleId[] = ["admin", "standard", "tool_user", "reader", "guest"]

export interface Member {
  id: string
  /** 工作单位邮箱：登录账号，邀请制 */
  email: string
  name: string
  dept: string
  role: RoleId
  status: "active" | "invited" | "disabled"
  /** 与模板不同的功能开关：true = 额外开通，false = 单独关闭 */
  featureOverrides: Partial<Record<Feature, boolean>>
  collections?: Collection[]
  quota?: Partial<Quota>
  usage: { storageGB: number; aiThisMonth: number }
  invitedAt?: number
  invitedBy?: string
  lastLoginAt?: number
}

export const MEMBERS: Member[] = [
  { id: "u1", email: "zhang.ming@studio.cn", name: "张明", dept: "设计一所", role: "admin", status: "active", featureOverrides: {}, usage: { storageGB: 36.2, aiThisMonth: 812 } },
  { id: "u2", email: "li.na@studio.cn", name: "李娜", dept: "设计一所", role: "standard", status: "active", featureOverrides: { project_create: true }, usage: { storageGB: 21.5, aiThisMonth: 640 } },
  { id: "u3", email: "wang.lei@studio.cn", name: "王磊", dept: "设计二所", role: "standard", status: "active", featureOverrides: { upload: false }, usage: { storageGB: 3.1, aiThisMonth: 1320 } },
  { id: "u4", email: "chen.jing@studio.cn", name: "陈静", dept: "技术质量部", role: "reader", status: "active", featureOverrides: { chat: true }, collections: ["standards", "atlas", "journals"], usage: { storageGB: 0.4, aiThisMonth: 96 } },
  { id: "u5", email: "liu.yang@studio.cn", name: "刘洋", dept: "参数化小组", role: "tool_user", status: "active", featureOverrides: {}, usage: { storageGB: 4.6, aiThisMonth: 180 } },
  { id: "u6", email: "zhao.min@studio.cn", name: "赵敏", dept: "设计二所", role: "standard", status: "invited", featureOverrides: {}, usage: { storageGB: 0, aiThisMonth: 0 } },
  { id: "u7", email: "zhou@partner-design.com", name: "周老师（外聘顾问）", dept: "外部", role: "reader", status: "active", featureOverrides: {}, usage: { storageGB: 0.1, aiThisMonth: 0 } },
  { id: "u8", email: "sun.yue@studio.cn", name: "孙悦（实习）", dept: "设计一所", role: "standard", status: "disabled", featureOverrides: {}, usage: { storageGB: 1.2, aiThisMonth: 0 } },
]

export interface ResolvedPermissions {
  features: Record<Feature, { on: boolean; overridden: boolean }>
  collections: Collection[]
  collectionsOverridden: boolean
  quota: Quota
}

/** 模板 + 单独调整 → 这个人最终的权限 */
export function resolve(m: Pick<Member, "role" | "featureOverrides" | "collections" | "quota">): ResolvedPermissions {
  const t = ROLES[m.role]
  const features = Object.fromEntries(
    FEATURE_ORDER.map((f) => {
      const base = t.features.includes(f)
      const o = m.featureOverrides[f]
      return [f, { on: o ?? base, overridden: o !== undefined && o !== base }]
    }),
  ) as ResolvedPermissions["features"]
  return {
    features,
    collections: m.collections ?? t.collections,
    collectionsOverridden: !!m.collections,
    quota: { ...t.quota, ...m.quota },
  }
}

export function overrideCount(m: Member) {
  const r = resolve(m)
  return FEATURE_ORDER.filter((f) => r.features[f].overridden).length + (r.collectionsOverridden ? 1 : 0)
}
