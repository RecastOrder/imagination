"use client"

import { useTransition } from "react"
import { EyeIcon, ShieldIcon, UserIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useAccount } from "./account-provider"

/**
 * 管理员对比视角（owner 2026-09-26：「对于我来说，给我提供一个按钮用来切换对比看管理员和用户的界面差异」）。
 * 只有真正的管理员看得到这个按钮；其他人主题区只有原来的按钮。
 * 切到“普通成员视角”后，服务端所有判定都按普通成员算，所以看到的就是成员真实看到的界面。
 */
export function ViewAsToggle({ compact = false }: { compact?: boolean }) {
  const { realAdmin, viewingAsMember, setViewAsMember } = useAccount()
  const [pending, start] = useTransition()
  if (!realAdmin) return null
  const label = viewingAsMember ? "正在看：普通成员视角（点一下回到管理员）" : "正在看：管理员视角（点一下切到普通成员）"
  const Icon = viewingAsMember ? UserIcon : ShieldIcon
  return (
    <button
      type="button"
      aria-pressed={viewingAsMember}
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() => start(() => setViewAsMember(!viewingAsMember))}
      className={cn(
        "flex shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50",
        compact ? "size-9" : "h-8 w-8 bg-sidebar-accent/60",
        viewingAsMember && "bg-primary-subtle text-primary-subtle-foreground",
      )}
    >
      <Icon className="size-3.5" />
    </button>
  )
}

/** 对比视角打开期间常驻顶部的提示：避免忘了切回来 */
export function ViewAsBanner() {
  const { viewingAsMember, setViewAsMember } = useAccount()
  const [pending, start] = useTransition()
  if (!viewingAsMember) return null
  return (
    <div
      role="status"
      className="fixed top-2 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-surface px-3 py-1 text-xs shadow-sm"
    >
      <EyeIcon className="size-3.5 text-muted-foreground" />
      <span>正在以普通成员视角查看</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => setViewAsMember(false))}
        className="cursor-pointer font-medium text-primary hover:underline disabled:opacity-50"
      >
        退出
      </button>
    </div>
  )
}
