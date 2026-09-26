"use client"

import { Fragment } from "react"
import { BookmarkIcon, ExternalLinkIcon, ImageOffIcon } from "lucide-react"

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
            {source.kind !== "report" && <span className="font-mono text-xs font-normal text-muted-foreground">原版 p.{s.page}</span>}
          </h2>
          {figuresAfter(source, s.figures, -1)}
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
            ) as React.ReactNode
          }).flatMap((node, i) => [node, <Fragment key={`f${i}`}>{figuresAfter(source, s.figures, i)}</Fragment>])}
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

/**
 * 原文里的图（媒体报道）：按原文顺序插在对应段落之后。hold 上已取回的直接显示；
 * 没取回的如实写出来并给原网址 —— 不从外站直接加载（那等于让读者的浏览器去别人服务器上取图）。
 */
function figuresAfter(source: Source, figures: { after: number; n: number; caption: string }[] | undefined, after: number) {
  const list = figures?.filter((f) => f.after === after) ?? []
  if (!list.length) return null
  return list.map((f) => {
    const img = source.images?.[f.n]
    return (
      <figure key={`fig-${f.n}`} data-figure={f.n} className="my-6 font-sans">
        {img?.local ? (
          // eslint-disable-next-line @next/next/no-img-element -- 鉴权后的动态图，从 hold 流式转来，不走 next/image 优化
          <img src={`/api/sources/${source.id}/asset/${f.n}`} alt={f.caption || `图 ${f.n + 1}`} loading="lazy" className="w-full rounded-md bg-surface-sunken" />
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
            <ImageOffIcon className="size-4" />
            这张图还没取回到资料库
            {img?.url && (
              <a href={img.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground">
                原网址 <ExternalLinkIcon className="size-3.5" />
              </a>
            )}
          </div>
        )}
        {f.caption && <figcaption className="mt-2 text-sm text-muted-foreground">{f.caption}</figcaption>}
      </figure>
    )
  })
}
