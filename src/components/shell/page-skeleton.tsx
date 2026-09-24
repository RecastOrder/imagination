import { Skeleton } from "@/components/ui/skeleton"

/**
 * 页面骨架屏：依赖网址参数的页面（对话、资料库）在浏览器接管前先显示它，
 * 让用户看到“页面的形状”而不是一片空白。
 */
export function PageSkeleton({ variant }: { variant: "chat" | "list" }) {
  if (variant === "chat") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4" aria-busy="true" aria-label="加载中">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="mt-6 h-28 w-full max-w-2xl rounded-2xl" />
      </div>
    )
  }
  return (
    <div className="mx-auto max-w-5xl space-y-3 px-4 py-6 sm:px-6" aria-busy="true" aria-label="加载中">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-8 w-80" />
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  )
}
