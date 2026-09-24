import { LockIcon } from "lucide-react"

import type { Source } from "@/lib/sources/types"
import { cn } from "@/lib/utils"

/** 元信息行：编号 · 作者 · 地区 · 年份。统一用中点分隔，弱化颜色 */
export function SourceMeta({ source, className }: { source: Source; className?: string }) {
  const parts = [source.code, source.authors?.join("、"), source.region, String(source.year)].filter(Boolean)
  return (
    <p className={cn("flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground", className)}>
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden>·</span>}
          {p}
        </span>
      ))}
      {source.access === "member" && (
        <span className="ml-1 inline-flex items-center gap-0.5" title="登录后可阅读全文">
          <LockIcon className="size-3" />
          会员
        </span>
      )}
    </p>
  )
}
