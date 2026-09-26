"use client"

import { cn } from "@/lib/utils"

/**
 * 分段控件（Segmented Control）：2–4 个互斥选项并排，当前项“浮起”。
 * 用于切换“视图 / 模式”，例如 文本|原版、严谨|发散。选项超过 4 个时改用下拉。
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  label,
  className,
}: {
  value: T
  onChange: (v: T) => void
  /** disabled：这一项此刻不可用（例如资料没有原件），置灰且点不动，title 说明原因 */
  options: { value: T; label: React.ReactNode; title?: string; disabled?: boolean }[]
  size?: "sm" | "md"
  label: string
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-md bg-secondary p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-[5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-default disabled:opacity-40 disabled:hover:text-muted-foreground [&_svg]:size-3.5",
            size === "sm" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-[13px]",
            value === o.value && "bg-surface text-foreground shadow-sm",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
