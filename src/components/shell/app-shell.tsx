"use client"

import { Suspense, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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
 * - 桌面：展开；但打开预览面板、或进入自带目录树的页面，且屏宽 <1536 时，自动收成图标栏
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const isMd = useMinWidth("md")
  const isLg = useMinWidth("lg")
  const is2xl = useMinWidth("2xl", false)
  // 预览面板是否打开：由一个小组件单独读取网址参数，
  // 避免整个外壳因为读网址参数而放弃服务端渲染（否则首屏是空白）
  const [peekOpen, setPeekOpen] = useState(false)
  const [userCollapsed, setUserCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const router = useRouter()
  // 自带目录树的页面（文件浏览）：应用侧栏自动收成图标栏，把宽度让给目录和内容
  const hasOwnTree = usePathname().startsWith("/browse")

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

  // 手机上“显示 / 隐藏侧栏”交给 CSS 媒体查询决定（服务端渲染时就正确，不会先闪一下桌面布局）；
  // JS 只负责桌面上“展开 / 图标栏”的选择
  const variant: SidebarVariant = !isLg ? "rail" : userCollapsed || ((peekOpen || hasOwnTree) && !is2xl) ? "rail" : "expanded"

  return (
    <TooltipProvider>
      <Suspense>
        <PeekWatcher onChange={setPeekOpen} />
      </Suspense>
      <div className="flex h-dvh overflow-hidden">
        <div className="hidden md:flex">
          <Sidebar variant={variant} onToggle={isLg ? () => setUserCollapsed((v) => !v) : undefined} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-2 md:hidden">
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

function PeekWatcher({ onChange }: { onChange: (open: boolean) => void }) {
  const open = useSearchParams().has("peek")
  useEffect(() => onChange(open), [open, onChange])
  return null
}
