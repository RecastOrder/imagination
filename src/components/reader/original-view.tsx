"use client"

import { FileTextIcon } from "lucide-react"

import type { Source } from "@/lib/sources/types"

/**
 * 原版视图：保持和纸质版完全一致的版式（图集、图纸必须看原版）。
 * 演示阶段用“纸张”模拟 PDF 页面；真实环境用 PDF.js 渲染原始文件，
 * 页码与文本视图的段落一一对应，所以两种视图可以互相跳转。
 */
export function OriginalView({ source, zoom }: { source: Source; zoom: number }) {
  const pages = Array.from({ length: source.pages }, (_, i) => i + 1)
  const isAtlas = source.kind === "atlas"

  return (
    <div className="space-y-6">
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <FileTextIcon className="size-3.5" />
        演示：此处将用 PDF.js 显示原始 PDF，共 {source.pages} 页
      </p>
      {pages.map((n) => {
        const section = source.sections.find((s) => s.page === n)
        return (
          <div
            key={n}
            id={`page-${n}`}
            data-page={n}
            className="mx-auto scroll-mt-6 bg-paper text-ink shadow-float ring-1 ring-ink/5"
            style={{ width: `${Math.round(zoom * 100)}%`, aspectRatio: isAtlas ? "297 / 210" : "210 / 297" }}
          >
            <PageContent source={source} n={n} section={section} isAtlas={isAtlas} />
          </div>
        )
      })}
    </div>
  )
}

function PageContent({
  source,
  n,
  section,
  isAtlas,
}: {
  source: Source
  n: number
  section?: Source["sections"][number]
  isAtlas: boolean
}) {
  // 纸张内容模拟“印刷品”：用 paper / ink 令牌，不跟随主题反色（真实 PDF 也不会变色）
  return (
    <div className="flex h-full flex-col p-[7%] font-serif text-[10px] leading-relaxed sm:text-[11px]">
      <div className="flex justify-between border-b border-ink/20 pb-1 text-[9px] text-ink/50">
        <span>{source.code ?? source.title}</span>
        <span>{source.title}</span>
      </div>
      {n === 1 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-[9px] tracking-[0.3em] text-ink/50">{source.code}</p>
          <p className="mt-3 text-lg font-semibold sm:text-2xl">{source.title}</p>
          <p className="mt-2 text-ink/60">{source.publisher}</p>
        </div>
      ) : isAtlas ? (
        <div className="mt-3 grid flex-1 grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <svg key={i} viewBox="0 0 100 80" className="h-full w-full border border-ink/30" aria-hidden>
              <path d="M10 60 H90 M10 60 V30 L50 12 L90 30 V60" fill="none" stroke="currentColor" strokeOpacity=".6" />
              <path d="M10 66 H90" stroke="currentColor" strokeOpacity=".3" strokeDasharray="2 2" />
              <text x="50" y="76" textAnchor="middle" fontSize="6" fill="currentColor" fillOpacity=".5">
                节点 {n}-{i + 1}
              </text>
            </svg>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {section && <p className="text-[12px] font-semibold sm:text-[13px]">{section.title}</p>}
          {section
            ? section.paragraphs.map((p, i) => (
                <p key={i} className="indent-[2em]">
                  {p}
                </p>
              ))
            : Array.from({ length: 14 }, (_, i) => (
                <div key={i} className="h-1.5 rounded-full bg-ink/10" style={{ width: `${70 + ((i * 37) % 30)}%` }} />
              ))}
        </div>
      )}
      <div className="mt-auto pt-2 text-center text-[9px] text-ink/50">— {n} —</div>
    </div>
  )
}
