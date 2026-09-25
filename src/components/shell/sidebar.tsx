"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookMarkedIcon,
  LogOutIcon,
  SettingsIcon,
  FolderIcon,
  FolderKanbanIcon,
  FolderTreeIcon,
  LibraryIcon,
  MessageSquareIcon,
  PaletteIcon,
  UsersIcon,
  PanelLeftIcon,
  ScrollTextIcon,
  SearchIcon,
  SquarePenIcon,
  type LucideIcon,
} from "lucide-react"

import { Kbd } from "@/components/ui/kbd"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAccount } from "@/components/account/account-provider"
import type { Feature } from "@/lib/auth/permissions"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Logo } from "./logo"
import { ThemeToggle } from "./theme-toggle"

/**
 * 左侧导航。一个组件，三种变体：
 * - expanded：桌面，完整文字
 * - rail    ：窄桌面 / 打开预览面板时，只显示图标（把宽度让给内容）
 * - drawer  ：手机，从左侧滑出（外层由 AppShell 包 Sheet）
 * 结构固定为：顶部（新建、搜索）→ 中部（导航、最近）→ 底部（主题、用户）
 */
export type SidebarVariant = "expanded" | "rail" | "drawer"

const NAV: { href: string; label: string; icon: LucideIcon; feature: Feature }[] = [
  { href: "/projects", label: "项目", icon: FolderKanbanIcon, feature: "library" },
  { href: "/chat", label: "对话", icon: MessageSquareIcon, feature: "chat" },
  { href: "/library", label: "资料库", icon: LibraryIcon, feature: "library" },
  { href: "/browse", label: "文件浏览", icon: FolderTreeIcon, feature: "library" },
  { href: "/notebook", label: "笔记本", icon: BookMarkedIcon, feature: "notebook" },
  { href: "/files", label: "我的文件", icon: FolderIcon, feature: "upload" },
]

/** 管理类入口：只有有对应权限的人才会看到（演示中默认当前用户是管理员） */
const ADMIN_NAV: { href: string; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { href: "/admin/members", label: "成员与权限", icon: UsersIcon, adminOnly: true },
  { href: "/admin/audit", label: "查看记录", icon: ScrollTextIcon, adminOnly: true },
  { href: "/design", label: "设计系统", icon: PaletteIcon },
]

const RECENT = [
  { id: "c1", title: "上海住宅日照间距要求" },
  { id: "c2", title: "光之教堂的相关报道" },
  { id: "c3", title: "平屋面防水构造做法" },
]

export function Sidebar({
  variant,
  onToggle,
  onNavigate,
}: {
  variant: SidebarVariant
  onToggle?: () => void
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const rail = variant === "rail"
  // 没有权限的入口直接不显示（而不是置灰）：用户不需要知道它存在
  const { isAdmin, features } = useAccount()
  const adminNav = ADMIN_NAV.filter((i) => !i.adminOnly || isAdmin)
  const nav = NAV.filter((i) => features[i.feature])

  return (
    <nav
      aria-label="主导航"
      className={cn(
        "flex h-full shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        variant === "expanded" && "w-64 border-r border-sidebar-border",
        variant === "rail" && "w-14 items-center border-r border-sidebar-border",
        variant === "drawer" && "w-full",
      )}
    >
      {/* 顶部 */}
      <div className={cn("flex h-14 items-center gap-2", rail ? "justify-center" : "px-3")}>
        {!rail && (
          <Link href="/chat" onClick={onNavigate} className="rounded-md px-1 text-[15px]">
            <Logo />
          </Link>
        )}
        {onToggle && (
          <RailTip label={rail ? "展开侧栏" : "收起侧栏"} show>
            <button
              type="button"
              onClick={onToggle}
              className={cn(
                "flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !rail && "ml-auto",
              )}
              aria-label={rail ? "展开侧栏" : "收起侧栏"}
            >
              <PanelLeftIcon className="size-4" />
            </button>
          </RailTip>
        )}
      </div>

      <div className={cn("flex flex-col gap-0.5", rail ? "items-center" : "px-2")}>
        {features.chat && (
          <SidebarItem href="/chat" icon={SquarePenIcon} label="新建对话" rail={rail} onNavigate={onNavigate} />
        )}
        {features.library && (
          <SidebarItem
            href="/library"
            icon={SearchIcon}
            label="检索资料"
            rail={rail}
            onNavigate={onNavigate}
            trailing={<Kbd>⌘K</Kbd>}
          />
        )}
      </div>

      {/* 中部 */}
      <div className={cn("mt-4 flex flex-col gap-0.5", rail ? "items-center" : "px-2")}>
        {!rail && <SectionLabel>工作区</SectionLabel>}
        {nav.map((item) => (
          <SidebarItem
            key={item.href}
            {...item}
            rail={rail}
            active={pathname === item.href || pathname.startsWith(item.href + "/")}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      <div className={cn("mt-4 flex flex-col gap-0.5", rail ? "items-center" : "px-2")}>
        {!rail && <SectionLabel>{isAdmin ? "管理" : "其他"}</SectionLabel>}
        {adminNav.map((item) => (
          <SidebarItem
            key={item.href}
            {...item}
            rail={rail}
            active={pathname === item.href || pathname.startsWith(item.href + "/")}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      {!rail && features.chat && (
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-2">
          <SectionLabel>最近对话</SectionLabel>
          {RECENT.map((c) => (
            <Link
              key={c.id}
              href="/chat"
              onClick={onNavigate}
              className="block truncate rounded-md px-2.5 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              {c.title}
            </Link>
          ))}
        </div>
      )}

      {/* 底部 */}
      <div className={cn("mt-auto flex flex-col gap-2 border-t border-sidebar-border py-3", rail ? "items-center" : "px-3")}>
        {rail ? <ThemeToggle compact /> : <ThemeToggle />}
        <UserMenu rail={rail} onNavigate={onNavigate} />
      </div>
    </nav>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-2.5 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">{children}</p>
}

function RailTip({ label, show, children }: { label: string; show: boolean; children: React.ReactNode }) {
  if (!show) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

function SidebarItem({
  href,
  icon: Icon,
  label,
  rail,
  active,
  trailing,
  onNavigate,
}: {
  href: string
  icon: LucideIcon
  label: string
  rail: boolean
  active?: boolean
  trailing?: React.ReactNode
  onNavigate?: () => void
}) {
  return (
    <RailTip label={label} show={rail}>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        aria-label={rail ? label : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-md text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          rail ? "size-9 justify-center" : "h-9 px-2.5",
          // 当前位置：用强调色的浅底 + 强调色图标——强调色的三种用途之一
          active && "bg-primary-subtle text-primary-subtle-foreground hover:bg-primary-subtle",
        )}
      >
        <Icon className={cn("size-4 shrink-0", active && "text-primary")} />
        {!rail && <span className="truncate">{label}</span>}
        {!rail && trailing && <span className="ml-auto">{trailing}</span>}
      </Link>
    </RailTip>
  )
}

/** 用户菜单：头像 + 邮箱；点击展开“账户设置 / 退出登录” */
function UserMenu({ rail, onNavigate }: { rail: boolean; onNavigate?: () => void }) {
  const { email, name, roleLabel, logout } = useAccount()
  const initial = name.slice(0, 1).toUpperCase()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`账户：${email}`}
          className={cn(
            "flex cursor-pointer items-center gap-2.5 rounded-md text-left hover:bg-sidebar-accent",
            rail ? "size-9 justify-center" : "-mx-1 px-1 py-1",
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
            {initial}
          </span>
          {!rail && (
            <span className="min-w-0 flex-1 text-sm leading-tight">
              <span className="block truncate font-medium">{name}</span>
              <span className="block truncate text-xs text-muted-foreground">{email}</span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side={rail ? "right" : "top"} align="start" className="w-56">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {email} · {roleLabel}
          </p>
        </div>
        <Link
          href="/settings"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
        >
          <SettingsIcon className="size-4 text-muted-foreground" />
          账户设置
        </Link>
        <button
          type="button"
          onClick={logout}
          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
        >
          <LogOutIcon className="size-4 text-muted-foreground" />
          退出登录
        </button>
      </PopoverContent>
    </Popover>
  )
}
