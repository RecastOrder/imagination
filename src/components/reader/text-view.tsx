"use client"

import { Fragment } from "react"
import { BookmarkIcon } from "lucide-react"

import { useLocalStore } from "@/hooks/use-local-store"
import { highlightsStore, notesStore } from "@/lib/notebook/store"
import type { Source } from "@/lib/sources/types"

/**
 * 文本视图：从 PDF 解析出来的结构化文本，按条文 / 章节重排。
 * 优点是可以自由调字号、手机上好读、能精确定位到段落。
 * 每个段落都记住自己在原版中的页码（data-para），两种视图靠它对应。
 */
export function TextView({ source, fontSize }: { source: Source; fontSize: number }) {
  const [highlights, writeHighlights] = useLocalStore(highlightsStore)
  const [notes] = useLocalStore(notesStore)
  const mine = highlights.filter((h) => h.sourceId === source.id)
  const excerpts = notes.filter((n) => n.kind === "excerpt" && n.sourceId === source.id)

  return (
    <div className="font-serif" style={{ fontSize }}>
      {source.sections.map((s) => (
        <section key={s.id} id={s.id} className="scroll-mt-6">
          <h2 className="mt-10 mb-4 flex items-baseline gap-3 font-sans text-lg font-semibold">
            {s.title}
            <span className="font-mono text-xs font-normal text-muted-foreground">原版 p.{s.page}</span>
          </h2>
          {s.paragraphs.map((p, i) => {
            const marks = mine.filter((h) => h.sectionId === s.id && h.paragraph === i).map((h) => h)
            const excerpted = excerpts.some((n) => n.sectionId === s.id && p.includes(n.text))
            return (
              <p key={i} data-para={`${s.id}:${i}:${s.page}`} className="relative mb-5 leading-[1.9] text-pretty">
                {excerpted && (
                  <BookmarkIcon
                    className="absolute top-2 -left-7 size-4 fill-primary/20 text-primary"
                    aria-label="已摘录到笔记本"
                  />
                )}
                {renderMarks(p, marks, (id) => writeHighlights((hs) => hs.filter((h) => h.id !== id)))}
              </p>
            )
          })}
        </section>
      ))}
    </div>
  )
}

/** 把段落里被高亮的片段包成 <mark>。点击高亮可以取消 */
function renderMarks(text: string, marks: { id: string; text: string }[], onRemove: (id: string) => void) {
  if (!marks.length) return text
  const parts: React.ReactNode[] = []
  let rest = text
  let key = 0
  while (rest) {
    let best: { idx: number; m: { id: string; text: string } } | null = null
    for (const m of marks) {
      const idx = rest.indexOf(m.text)
      if (idx >= 0 && (!best || idx < best.idx)) best = { idx, m }
    }
    if (!best) {
      parts.push(<Fragment key={key++}>{rest}</Fragment>)
      break
    }
    const { idx, m } = best
    if (idx > 0) parts.push(<Fragment key={key++}>{rest.slice(0, idx)}</Fragment>)
    parts.push(
      <mark
        key={key++}
        title="点击取消高亮"
        onClick={() => onRemove(m.id)}
        className="cursor-pointer rounded-[2px] bg-highlight px-0.5 text-inherit"
      >
        {m.text}
      </mark>,
    )
    rest = rest.slice(idx + m.text.length)
  }
  return parts
}
