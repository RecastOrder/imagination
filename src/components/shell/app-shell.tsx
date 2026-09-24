"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MenuIcon } from "lucide-react"

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useMinWidth } from "@/hooks/use-media-query"
import { Logo } from "./logo"
import { Sidebar, type SidebarVariant } from "./sidebar"

/**
 * 页面骨架（L3）：只决定“东西放在哪”，不关心具体内容。
 *
 *  ┌────────┬──────────────────────────────┐
 *  │ 侧栏    │ 主区（页面自己决定，可再分出预览面板）│
 *  └────────┴──────────────────────────────┘
 *
 * 侧栏变体的自动规则（“让位”原则：内容优先）：
 * - 手机（<768）：隐藏，顶部菜单按钮打开抽屉
 * - 平板（768–1024）：图标栏
 * - 桌面：展开；但打开预览面板且屏宽 <1536 时，自动收成图标栏，给内容腾地方
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const isMd = useMinWidth("md")
  const isLg = useMinWidth("lg")
  const is2xl = useMinWidth("2xl", false)
  const peekOpen = useSearchParams().has("peek")
  const [userCollapsed, setUserCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const router = useRouter()

  // ⌘K / Ctrl+K：全局检索
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        router.push("/library?focus=1")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [router])

  let variant: SidebarVariant | null
  if (!isMd) variant = null
  else if (!isLg) variant = "rail"
  else variant = userCollapsed || (peekOpen && !is2xl) ? "rail" : "expanded"

  return (
    <TooltipProvider>
      <div className="flex h-dvh overflow-hidden">
        {variant && <Sidebar variant={variant} onToggle={isLg ? () => setUserCollapsed((v) => !v) : undefined} />}

        <div className="flex min-w-0 flex-1 flex-col">
          {!isMd && (
            <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex size-9 cursor-pointer items-center justify-center rounded-md hover:bg-accent"
                aria-label="打开菜单"
              >
                <MenuIcon className="size-5" />
              </button>
              <Logo className="text-[15px]" />
            </header>
          )}
          <main className="min-h-0 flex-1">{children}</main>
        </div>
      </div>

      <Sheet open={drawerOpen && !isMd} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-[80vw] max-w-72 p-0" showClose={false}>
          <SheetTitle className="sr-only">导航</SheetTitle>
          <Sidebar variant="drawer" onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  )
}
