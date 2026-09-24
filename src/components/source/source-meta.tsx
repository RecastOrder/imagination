import { LockIcon } from "lucide-react"

import { STATUS_LABELS } from "@/lib/sources/kinds"
import type { Source, SourceStatus } from "@/lib/sources/types"
import { cn } from "@/lib/utils"

/** 规范效力状态：用状态色的小圆点 + 文字，不只靠颜色（WCAG：信息不能只用颜色传达） */
export function SourceStatusTag({ status }: { status: SourceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        status === "current" ? "text-success" : status === "abolished" ? "text-destructive" : "text-warning",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  )
}

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
      {source.status && (
        <span className="ml-1">
          <SourceStatusTag status={source.status} />
        </span>
      )}
      {source.access === "member" && (
        <span className="ml-1 inline-flex items-center gap-0.5" title="登录后可阅读全文">
          <LockIcon className="size-3" />
          会员
        </span>
      )}
    </p>
  )
}
