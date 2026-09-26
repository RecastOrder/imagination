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
 * - 桌面：展开；但打开预览面板、或进入自带目录树的页面时，宽度不够就自动收成图标栏。
 *   「够」＝ 屏宽 ≥1920（owner 2026-09-26「点击链接打开右侧抽屉时，如果宽度不够，可以让导航栏自动收回去」；
 *   原来是 1536 —— 1536–1920 之间的屏上，展开的侧栏 256 + 资料库筛选栏 + 45% 的抽屉把列表挤到 400 像素以下）
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const isMd = useMinWidth("md")
  const isLg = useMinWidth("lg")
  const isWide = useMinWidth("wide", false)
  // 预览面板是否打开：由一个小组件单独读取网址参数，
  // 避免整个外壳因为读网址参数而放弃服务端渲染（否则首屏是空白）
  const [peekOpen, setPeekOpen] = useState(false)
  // 用户手动选的（展开 / 收起）优先于自动规则；"auto" = 按下面的让位规则走。
  // 抽屉开关一次就回到 auto（owner 2026-09-26：自动收起后点展开「没有反应」—— 原来自动规则压过了手动）
  // 记下手动选择时抽屉开没开；抽屉状态一变，这次手动选择就失效（回到自动）—— 不用副作用去清
  const [manual, setManual] = useState<{ v: "expanded" | "collapsed"; peek: boolean } | null>(null)
  const pref = manual && manual.peek === peekOpen ? manual.v : "auto"
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
  const auto: SidebarVariant = (peekOpen || hasOwnTree) && !isWide ? "rail" : "expanded"
  const variant: SidebarVariant = !isLg ? "rail" : pref === "auto" ? auto : pref === "collapsed" ? "rail" : "expanded"

  return (
    <TooltipProvider>
      <Suspense>
        <PeekWatcher onChange={setPeekOpen} />
      </Suspense>
      <div className="flex h-dvh overflow-hidden">
        <div className="hidden md:flex">
          <Sidebar variant={variant} onToggle={isLg ? () => setManual({ v: variant === "rail" ? "expanded" : "collapsed", peek: peekOpen }) : undefined} />
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
  // 右侧抽屉：资料预览（?peek=）与「我的文件 / 存储总库」打开的文件（?file=）都算
  const q = useSearchParams()
  const open = q.has("peek") || q.has("file")
  useEffect(() => onChange(open), [open, onChange])
  return null
}
