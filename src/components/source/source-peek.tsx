"use client"

import Link from "next/link"
import { BookOpenTextIcon, FolderPlusIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AddToProject } from "@/components/projects/add-to-project"
import { useSource } from "@/hooks/use-sources"
import { SourceKindBadge } from "./source-kind-badge"
import { SourceMeta } from "./source-meta"

/**
 * 预览面板的“内容”。它不关心自己被放在分栏里还是抽屉里——
 * 容器由 PeekLayout 根据屏幕宽度决定。
 *
 * 三级递进：引用标签（看到） → 预览面板（看清） → 阅读模式（读透）
 * 预览只给“判断是不是我要的”所需的信息：元信息、摘要、目录、命中段落。
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
              阅读模式
            </Link>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="关闭预览">
            <XIcon />
          </Button>
        </div>
      </header>

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
    </div>
  )
}
