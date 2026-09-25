"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AtSignIcon, BellIcon } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { AppNotification } from "@/lib/notifications"
import { cn } from "@/lib/utils"

const when = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 1) return "刚刚"
  if (m < 60) return `${m} 分钟前`
  if (m < 60 * 24) return `${Math.round(m / 60)} 小时前`
  return new Date(t).toLocaleDateString("zh-CN")
}

/**
 * 通知铃铛（已定：只通知被 @ 的人）。
 * 有未读时铃铛上显示数字；点开看列表，点一条直接跳到那个问题。
 * 每分钟、以及切回这个页面时刷新一次。
 */
export function NotificationBell({ side = "bottom", className }: { side?: "bottom" | "right"; className?: string }) {
  const router = useRouter()
  const [data, setData] = useState<{ items: AppNotification[]; unread: number }>({ items: [], unread: 0 })
  const [open, setOpen] = useState(false)

  const load = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 60_000)
    window.addEventListener("focus", load)
    return () => {
      clearInterval(t)
      window.removeEventListener("focus", load)
    }
  }, [load])

  const read = (ids?: string[]) =>
    fetch("/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {})

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) load()
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={data.unread ? `通知，${data.unread} 条未读` : "通知"}
          className={cn(
            "relative flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            className,
          )}
        >
          <BellIcon className="size-4" />
          {data.unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background tabular-nums">
              {data.unread > 9 ? "9+" : data.unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} align="start" className="w-80 p-0">
        <div className="flex items-center border-b px-3 py-2">
          <span className="text-sm font-medium">通知</span>
          {data.unread > 0 && (
            <button type="button" onClick={() => read()} className="ml-auto cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              全部标为已读
            </button>
          )}
        </div>
        {data.items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            没有通知。
            <br />
            只有同事在问题里 @ 你时，才会收到。
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto py-1">
            {data.items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    if (!n.readAt) read([n.id])
                    router.push(n.href)
                  }}
                  className="flex w-full cursor-pointer gap-2.5 px-3 py-2 text-left hover:bg-accent"
                >
                  <AtSignIcon className={cn("mt-0.5 size-4 shrink-0", n.readAt ? "text-muted-foreground" : "text-foreground")} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", !n.readAt && "font-medium")}>{n.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{n.text}</span>
                    <span className="block text-xs text-muted-foreground">{when(n.at)}</span>
                  </span>
                  {!n.readAt && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-foreground" aria-label="未读" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
