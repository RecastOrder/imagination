"use client"

import { useEffect, useState } from "react"
import { BookmarkPlusIcon, CopyIcon, HighlighterIcon, SparklesIcon } from "lucide-react"

import { toast } from "@/components/ui/toast"
import { SaveToNotebook } from "@/components/notebook/save-to-notebook"
import { useMediaQuery } from "@/hooks/use-media-query"
import { highlightsStore, newId } from "@/lib/notebook/store"
import type { Source } from "@/lib/sources/types"

/** 选中的文字 + 它在文档中的位置（章节、段落、页码），用于生成回链 */
export interface Selected {
  text: string
  sectionId: string
  paragraph: number
  page: number
  rect: DOMRect
}

/**
 * 选中文字后出现的浮动工具栏（Medium、Notion、Kindle 的做法）。
 * - 桌面：出现在选区正上方，鼠标不用走远（费茨定律：目标越近越好点）
 * - 触屏：固定在屏幕底部，避免和系统自带的“复制/全选”菜单打架
 *
 * 段落元素需要带 data-para="章节id:段落序号:页码"。
 */
export function SelectionToolbar({
  source,
  containerRef,
  onAsk,
}: {
  source: Source
  containerRef: React.RefObject<HTMLElement | null>
  onAsk: (quote: string) => void
}) {
  const [sel, setSel] = useState<Selected | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const coarse = useMediaQuery("(pointer: coarse)")

  useEffect(() => {
    const onChange = () => {
      const s = window.getSelection()
      const text = s?.toString().trim()
      if (!s || s.isCollapsed || !text || !s.rangeCount) {
        if (!menuOpen) setSel(null)
        return
      }
      const range = s.getRangeAt(0)
      const start = (range.startContainer.parentElement)?.closest<HTMLElement>("[data-para]")
      const end = (range.endContainer.parentElement)?.closest<HTMLElement>("[data-para]")
      // 只处理单个段落内的选择，跨段落的高亮以后再支持
      if (!start || start !== end || !containerRef.current?.contains(start)) {
        if (!menuOpen) setSel(null)
        return
      }
      const [sectionId, para, page] = start.dataset.para!.split(":")
      setSel({ text, sectionId, paragraph: Number(para), page: Number(page), rect: range.getBoundingClientRect() })
    }
    document.addEventListener("selectionchange", onChange)
    return () => document.removeEventListener("selectionchange", onChange)
  }, [containerRef, menuOpen])

  if (!sel) return null

  const section = source.sections.find((s) => s.id === sel.sectionId)
  const cite = `——《${source.title}》${source.code ? ` ${source.code}` : ""} ${section?.title ?? ""}，第 ${sel.page} 页`

  const done = () => {
    window.getSelection()?.removeAllRanges()
    setSel(null)
  }

  const style: React.CSSProperties = coarse
    ? { left: "50%", bottom: 20, transform: "translateX(-50%)" }
    : {
        left: Math.min(Math.max(sel.rect.left + sel.rect.width / 2, 170), window.innerWidth - 170),
        top: Math.max(sel.rect.top - 48, 8),
        transform: "translateX(-50%)",
      }

  const btn =
    "flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-background/90 hover:bg-background/15 hover:text-background [&_svg]:size-3.5"

  return (
    <div
      role="toolbar"
      aria-label="选中文字的操作"
      style={style}
      // 阻止 mousedown 的默认行为：点击按钮时不会把选区清掉
      onMouseDown={(e) => e.preventDefault()}
      className="fixed z-50 flex items-center gap-0.5 rounded-lg bg-foreground p-1 shadow-float animate-in fade-in-0 zoom-in-95"
    >
      <button
        type="button"
        className={btn}
        onClick={() => {
          highlightsStore.write((hs) => [
            ...hs,
            { id: newId("h"), sourceId: source.id, sectionId: sel.sectionId, paragraph: sel.paragraph, text: sel.text },
          ])
          done()
        }}
      >
        <HighlighterIcon />
        高亮
      </button>
      <SaveToNotebook
        side={coarse ? "top" : "bottom"}
        onOpenChange={setMenuOpen}
        onSaved={done}
        note={() => ({
          kind: "excerpt",
          text: sel.text,
          sourceId: source.id,
          sectionId: sel.sectionId,
          page: sel.page,
        })}
      >
        <button type="button" className={btn}>
          <BookmarkPlusIcon />
          存入笔记本
        </button>
      </SaveToNotebook>
      <button
        type="button"
        className={btn}
        onClick={() => {
          onAsk(sel.text)
          done()
        }}
      >
        <SparklesIcon />
        问 AI
      </button>
      <span className="mx-0.5 h-4 w-px bg-background/20" aria-hidden />
      <button
        type="button"
        className={btn}
        title="复制时自动附上出处"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(`${sel.text}\n${cite}`)
            toast("已复制，并附上出处")
          } catch {
            toast("复制失败，请手动复制")
          }
          done()
        }}
      >
        <CopyIcon />
        <span className="hidden sm:inline">复制</span>
      </button>
    </div>
  )
}
