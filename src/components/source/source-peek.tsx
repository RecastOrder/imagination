"use client"

import Link from "next/link"
import { BookOpenTextIcon, FolderPlusIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AddToProject } from "@/components/projects/add-to-project"
import { useSource } from "@/hooks/use-sources"
import { SourceKindBadge } from "./source-kind-badge"
import { SourceMeta } from "./source-meta"
import { HoldOriginalView } from "@/components/reader/hold-original-view"
import { ProvenanceLine } from "@/components/reader/provenance-line"
import { TextView } from "@/components/reader/text-view"

/**
 * 预览面板的“内容”。它不关心自己被放在分栏里还是抽屉里——
 * 容器由 PeekLayout 根据屏幕宽度决定。
 *
 * 三级递进：引用标签（看到） → 预览面板（看清） → 阅读模式（读透）
 * 两种打开方式（owner 2026-09-26「点击资料库文件连接的时候，右侧的抽屉直接显示对应源文件。」）：
 * - 从资料库点开（没有 sectionId）⇒ 抽屉里直接是源文件：有原件放 PDF 原件，媒体放原文和图（按原顺序）
 * - 从对话引用点开（带 sectionId）⇒ 先给命中段落与目录，方便判断是不是要的那一条
 */
export function SourcePeek({
  sourceId,
  sectionId,
  onClose,
}: {
  sourceId: string
  sectionId?: string | null
  onClose: () => void
}) {
  const { source, loading } = useSource(sourceId)

  if (loading) {
    return <p className="p-8 text-center text-sm text-muted-foreground">正在打开…</p>
  }

  if (!source) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">没有找到这份资料。说不出出处（哪条抓取车道、何时、哪个网址）的资料不对外显示。</p>
        <Button variant="outline" size="sm" onClick={onClose}>
          关闭
        </Button>
      </div>
    )
  }

  const focus = source.sections.find((s) => s.id === sectionId) ?? source.sections[0]

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      {/* 面板头：固定，不随内容滚动 */}
      <header className="flex items-center gap-2 border-b px-4 py-2.5">
        <SourceKindBadge kind={source.kind} />
        <span className="truncate text-sm text-muted-foreground">资料预览</span>
        <div className="ml-auto flex items-center gap-1">
          <AddToProject
            defaultCategory={source.kind === "standard" ? "规范依据" : "案例参考"}
            item={() => ({ title: source.code ? `${source.title}（${source.code}）` : source.title, sourceId: source.id, sectionId: focus?.id })}
          >
            <Button variant="outline" size="sm">
              <FolderPlusIcon />
              加入项目
            </Button>
          </AddToProject>
          <Button asChild size="sm">
            <Link href={`/library/${source.id}${focus ? `#${focus.id}` : ""}`}>
              <BookOpenTextIcon />
              全屏阅读
            </Link>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="关闭预览">
            <XIcon />
          </Button>
        </div>
      </header>

      {!sectionId && (
        <div data-peek-source className="flex min-h-0 flex-1 flex-col">
          <div className="border-b px-4 py-2">
            <p className="truncate text-sm font-medium" title={source.title}>{source.title}</p>
            <ProvenanceLine source={source} />
          </div>
          {source.hasOriginal ? (
            <div className="min-h-0 flex-1">
              <HoldOriginalView source={source} className="h-full" />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-10">
              {source.hasOriginal === false && source.kind !== "report" && (
                <p className="mb-3 text-xs text-muted-foreground">这份资料目前只有识别出的文字，原件还没接入；数字请以原件为准。</p>
              )}
              <TextView source={source} fontSize={16} />
            </div>
          )}
        </div>
      )}
      {sectionId && (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-6 pt-6 pb-10">
          <h2 className="text-xl leading-snug font-semibold text-balance">{source.title}</h2>
          <SourceMeta source={source} className="mt-2" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {source.tags.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>

          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{source.summary}</p>

          {focus && (
            <section className="mt-6 rounded-lg border-l-2 border-primary bg-surface-sunken px-4 py-3">
              <p className="text-xs font-medium text-primary">命中段落 · {focus.title}</p>
              <p className="mt-2 font-serif text-[15px] leading-[1.9]">{focus.paragraphs[0]}</p>
            </section>
          )}

          <h3 className="mt-8 mb-2 text-xs font-medium tracking-wide text-muted-foreground">目录</h3>
          <ol className="space-y-0.5">
            {source.sections.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/library/${source.id}#${s.id}`}
                  className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  {s.title}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
      )}
    </div>
  )
}
