import {
  BookOpenIcon,
  FileTextIcon,
  LayersIcon,
  NewspaperIcon,
  ScaleIcon,
  ScrollTextIcon,
  type LucideIcon,
} from "lucide-react"

import type { AuthorityLevel, SourceKind, SourceStatus } from "./types"

/**
 * 资料类型用“图标 + 文字”区分，而不是给每类配一种颜色。
 * 原因：颜色一多，强调色就不再“鲜明”；而且色弱用户分不清。
 */
export const SOURCE_KINDS: Record<
  SourceKind,
  {
    label: string
    icon: LucideIcon
    authority: AuthorityLevel
    /** 默认用哪种视图打开：图集看原版，其余看文本 */
    defaultView: "text" | "original"
  }
> = {
  standard: { label: "规范", icon: ScaleIcon, authority: 1, defaultView: "text" },
  atlas: { label: "图集", icon: LayersIcon, authority: 2, defaultView: "original" },
  magazine: { label: "杂志", icon: NewspaperIcon, authority: 3, defaultView: "text" },
  article: { label: "文章", icon: FileTextIcon, authority: 3, defaultView: "text" },
  book: { label: "书籍", icon: BookOpenIcon, authority: 3, defaultView: "text" },
  report: { label: "媒体", icon: ScrollTextIcon, authority: 4, defaultView: "text" },
}

export const AUTHORITY_LABELS: Record<AuthorityLevel, string> = {
  1: "规范规章",
  2: "图集 · 标准做法",
  3: "期刊 · 论文 · 专著",
  4: "案例 · 报道",
  5: "个人笔记",
}

export const STATUS_LABELS: Record<SourceStatus, string> = {
  current: "现行",
  superseded: "已被替代",
  abolished: "已废止",
  unverified: "未核对",
}

export const SOURCE_KIND_ORDER: SourceKind[] = [
  "standard",
  "atlas",
  "book",
  "magazine",
  "article",
  "report",
]
