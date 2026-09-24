"use client"

import Link from "next/link"
import { CornerDownRightIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SourceStatusTag } from "@/components/source/source-meta"
import { useLocalStore } from "@/hooks/use-local-store"
import { REF_CATEGORIES, projectRefsStore, removeProjectRef } from "@/lib/projects/refs"
import { getSource } from "@/lib/sources/mock"

/** 依据清单：按分类列出成员加进来的内容，点击回到原文 */
export function RefsTab({ projectId }: { projectId: string }) {
  const [all] = useLocalStore(projectRefsStore)
  const refs = all.filter((r) => r.projectId === projectId)

  if (refs.length === 0)
    return (
      <div className="rounded-xl border border-dashed px-6 py-14 text-center">
        <p className="font-medium">依据清单还是空的</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          在对话回答下方、资料预览的顶部、阅读时选中文字，都可以点“加入项目”，把有用的内容收进来。
        </p>
      </div>
    )

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        成员收集的参考内容。这里只做收集和分类，是否采用、如何执行，由项目成员自己判断确认。
      </p>
      {REF_CATEGORIES.map((cat) => {
        const list = refs.filter((r) => r.category === cat)
        if (!list.length) return null
        return (
          <section key={cat}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              {cat}
              <span className="text-xs font-normal text-muted-foreground">{list.length}</span>
            </h3>
            <ul className="divide-y rounded-xl border bg-surface">
              {list.map((r) => {
                const s = r.sourceId ? getSource(r.sourceId) : undefined
                return (
                  <li key={r.id} className="group px-4 py-3">
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-sm font-medium">{r.title}</p>
                      {s?.status && s.status !== "current" && <SourceStatusTag status={s.status} />}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
                        onClick={() => removeProjectRef(r.id)}
                        aria-label="从清单移除"
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                    {r.text && <p className="mt-1 border-l-2 border-border-strong pl-3 font-serif text-[15px] leading-relaxed">{r.text}</p>}
                    {r.note && <p className="mt-1.5 text-sm text-muted-foreground">备注：{r.note}</p>}
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      <span>
                        {r.addedBy.split("@")[0]} · {new Date(r.addedAt).toLocaleDateString("zh-CN")}
                      </span>
                      {s && (
                        <Link href={`/library/${s.id}${r.sectionId ? `#${r.sectionId}` : ""}`} className="inline-flex items-center gap-1 hover:text-primary">
                          <CornerDownRightIcon className="size-3" />
                          《{s.title}》原文
                        </Link>
                      )}
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
