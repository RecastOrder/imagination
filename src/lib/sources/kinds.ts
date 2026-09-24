import {
  BookOpenIcon,
  FileTextIcon,
  LayersIcon,
  NewspaperIcon,
  ScaleIcon,
  ScrollTextIcon,
  type LucideIcon,
} from "lucide-react"

import type { SourceKind } from "./types"

/**
 * 资料类型用“图标 + 文字”区分，而不是给每类配一种颜色。
 * 原因：颜色一多，强调色就不再“鲜明”；而且色弱用户分不清。
 */
export const SOURCE_KINDS: Record<SourceKind, { label: string; icon: LucideIcon }> = {
  standard: { label: "规范", icon: ScaleIcon },
  atlas: { label: "图集", icon: LayersIcon },
  magazine: { label: "杂志", icon: NewspaperIcon },
  book: { label: "书籍", icon: BookOpenIcon },
  article: { label: "文章", icon: FileTextIcon },
  report: { label: "报道", icon: ScrollTextIcon },
}

export const SOURCE_KIND_ORDER: SourceKind[] = [
  "standard",
  "atlas",
  "book",
  "magazine",
  "article",
  "report",
]
