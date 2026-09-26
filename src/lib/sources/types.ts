/**
 * 资料（Source）是整个产品的核心对象。
 * 对话、检索、预览、阅读四个环节展示的都是同一个 Source，
 * 所以无论从哪个入口进来，最终都汇合到同一个预览面板和阅读页。
 */

export type SourceKind = "standard" | "atlas" | "magazine" | "book" | "article" | "report"

export type AccessLevel = "public" | "member"

export interface SourceSection {
  id: string
  title: string
  paragraphs: string[]
  /** 在原版 PDF 中的起始页码：文本视图和原版视图靠它互相对应 */
  page: number
}

/** 规范的效力状态：严谨模式下必须显示 */
/** unverified = 我们还没有核对过它的效力状态（资料卡里没有这项）：不许默认成“现行” */
export type SourceStatus = "current" | "superseded" | "abolished" | "unverified"

/**
 * 权威等级：决定资料能否作为“有出处的结论”被引用。
 * 1 规范规章 · 2 图集标准做法 · 3 期刊论文 · 4 案例报道图片 · 5 个人笔记
 */
export type AuthorityLevel = 1 | 2 | 3 | 4 | 5

export interface Source {
  id: string
  kind: SourceKind
  title: string
  /** 规范编号、图集号、期号等 */
  code?: string
  authors?: string[]
  publisher?: string
  region: string
  year: number
  tags: string[]
  summary: string
  /** 访客只能看到 public 资料的摘要，正文需要登录 */
  access: AccessLevel
  /** 仅规范、规章有 */
  status?: SourceStatus
  /** 原版 PDF 总页数 */
  pages: number
  /** false = 我们手上这份只有文字、原件还没接进来（hold 资料在接入原件之前）：阅读器不许拿演示页面冒充原版 */
  hasOriginal?: boolean
  /** 原文出处网址（媒体报道等） */
  originUrl?: string
  /** 版权说明原话（例如「仅供内部研究 · 不得转载」） */
  rights?: string
  sections: SourceSection[]
}

/** 列表、筛选、预览头部用的元信息：不含正文 */
export type SourceMeta = Omit<Source, "sections">

/** 已被替代或已废止：这两种才需要“请核对新版”的提醒；未核对不算 */
export const isOutdated = (s?: { status?: SourceStatus }) => s?.status === "superseded" || s?.status === "abolished"

/** 检索条件：URL 查询参数 ⇄ 这个对象 ⇄ 界面上的筛选标签，三者一一对应 */
export interface SourceFilters {
  q?: string
  kinds: SourceKind[]
  regions: string[]
  yearFrom?: number
  yearTo?: number
}
