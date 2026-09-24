import { cn } from "@/lib/utils"

/**
 * 用量条（Meter）：表示“已用 / 上限”。超过 85% 变为警示色。
 * 注意和进度条（Progress）区分：进度条表示任务完成度，会走到 100% 并结束。
 */
export function Meter({ value, max, className, label }: { value: number; max: number; className?: string; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-secondary", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width]", pct > 85 ? "bg-warning" : "bg-foreground/60")}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
