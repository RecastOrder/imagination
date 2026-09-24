"use client"

import Link from "next/link"
import { BookOpenTextIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SourceKindBadge } from "@/components/source/source-kind-badge"
import { SourceMeta } from "@/components/source/source-meta"
import { getSource } from "@/lib/sources/mock"

/** 平台资料库里的资料：显示摘要和正文，可进入完整的阅读模式（文本 / 原版、摘录、问 AI） */
export function SourceViewer({ sourceId }: { sourceId: string }) {
  const s = getSource(sourceId)
  if (!s) return <p className="p-8 text-center text-sm text-muted-foreground">找不到这份资料</p>
  return (
    <div className="h-full overflow-y-auto">
      <article className="mx-auto max-w-(--reader-measure) px-6 py-10">
        <div className="flex items-center gap-2">
          <SourceKindBadge kind={s.kind} />
          <Button asChild size="sm" className="ml-auto">
            <Link href={`/library/${s.id}`}>
              <BookOpenTextIcon />
              阅读模式
            </Link>
          </Button>
        </div>
        <h1 className="mt-4 font-serif text-2xl leading-snug font-semibold text-balance">{s.title}</h1>
        <SourceMeta source={s} className="mt-2 text-sm" />
        <p className="mt-5 border-y py-4 text-sm leading-relaxed text-muted-foreground">{s.summary}</p>
        {s.sections.map((sec) => (
          <section key={sec.id}>
            <h2 className="mt-8 mb-3 text-lg font-semibold">{sec.title}</h2>
            {sec.paragraphs.map((p, i) => (
              <p key={i} className="mb-4 font-serif text-[16px] leading-[1.9]">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </div>
  )
}
