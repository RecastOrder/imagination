"use client"

import { useEffect } from "react"

import { ResizableGroup, ResizableHandle, ResizablePanel } from "@/components/ui/resizable"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { SourcePeek } from "@/components/source/source-peek"
import { useMinWidth } from "@/hooks/use-media-query"
import { usePeek } from "@/hooks/use-peek"

/**
 * “主内容 + 资料预览”布局。对话页和资料库页都用它包一层。
 *
 * 为了保证“拉进来之后当前视窗能 fit”，按屏宽切换三种容器：
 * - ≥1024 桌面：并排分栏，可拖拽。主区最窄 420px（保证对话可读），
 *               预览默认 45%，最窄 360px、最宽 65%。
 * - 768–1024 平板：右侧抽屉覆盖在主区上（并排会把两边都挤坏）
 * - <768 手机：底部抽屉，占 88% 高度，下滑或点遮罩关闭
 */
export function PeekLayout({ children }: { children: React.ReactNode }) {
  const { peekId, sectionId, closePeek } = usePeek()
  const isLg = useMinWidth("lg")
  const isMd = useMinWidth("md")

  // Esc 关闭（抽屉模式由 Radix 自带）
  useEffect(() => {
    if (!peekId || !isLg) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePeek()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [peekId, isLg, closePeek])

  if (isLg) {
    return (
      <ResizableGroup orientation="horizontal">
        <ResizablePanel id="main" minSize={420} className="h-full">
          {children}
        </ResizablePanel>
        {peekId && (
          <>
            <ResizableHandle />
            <ResizablePanel
              id="peek"
              defaultSize="45%"
              minSize={360}
              maxSize="65%"
              className="h-full animate-in duration-200 fade-in-0 slide-in-from-right-4"
            >
              <aside aria-label="资料预览" className="h-full">
                <SourcePeek sourceId={peekId} sectionId={sectionId} onClose={closePeek} />
              </aside>
            </ResizablePanel>
          </>
        )}
      </ResizableGroup>
    )
  }

  return (
    <>
      {children}
      <Sheet open={!!peekId} onOpenChange={(open) => !open && closePeek()}>
        <SheetContent side={isMd ? "right" : "bottom"} showClose={false} className="overflow-hidden p-0">
          <SheetTitle className="sr-only">资料预览</SheetTitle>
          {!isMd && <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border-strong" aria-hidden />}
          {peekId && <SourcePeek sourceId={peekId} sectionId={sectionId} onClose={closePeek} />}
        </SheetContent>
      </Sheet>
    </>
  )
}
