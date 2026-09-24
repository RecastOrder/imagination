import { cn } from "@/lib/utils"

/** 骨架屏：加载中先给出“形状”，比转圈更让人安心 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="skeleton" className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />
  )
}

export { Skeleton }
