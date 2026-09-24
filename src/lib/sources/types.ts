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
}

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
  sections: SourceSection[]
}

/** 检索条件：URL 查询参数 ⇄ 这个对象 ⇄ 界面上的筛选标签，三者一一对应 */
export interface SourceFilters {
  q?: string
  kinds: SourceKind[]
  regions: string[]
  yearFrom?: number
  yearTo?: number
}
