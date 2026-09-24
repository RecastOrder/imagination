import { cn } from "@/lib/utils"

/** 临时标识：一个“剖面 + 光线”的几何符号，后期品牌设计时替换 */
export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 24 24" className="size-6 shrink-0" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" className="fill-foreground" />
        <path d="M8 17V9.5L12 7l4 2.5V17" className="fill-none stroke-background" strokeWidth="1.8" />
        <path d="M12 11v6" className="stroke-primary" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {withText && <span>Imagination</span>}
    </span>
  )
}
