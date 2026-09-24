"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { BookMarkedIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useLocalStore } from "@/hooks/use-local-store"
import { createNotebook, notebooksStore, notesStore } from "@/lib/notebook/store"

/** 笔记本列表：一个笔记本对应一个项目或一个主题 */
export function NotebookList() {
  const [notebooks] = useLocalStore(notebooksStore)
  const [notes] = useLocalStore(notesStore)
  const router = useRouter()

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">笔记本</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              按项目收集摘录、AI 回答和备忘；提问时可以只在某个笔记本范围内回答。
            </p>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const title = new FormData(e.currentTarget).get("title")?.toString().trim()
              if (!title) return
              router.push(`/notebook/${createNotebook(title).id}`)
            }}
          >
            <input
              name="title"
              placeholder="新笔记本名称"
              className="h-9 w-44 rounded-md border border-input bg-surface px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
            />
            <Button type="submit">
              <PlusIcon />
              新建
            </Button>
          </form>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notebooks.map((nb) => {
            const mine = notes.filter((n) => n.notebookId === nb.id)
            const sources = new Set(mine.map((n) => n.sourceId).filter(Boolean)).size
            return (
              <li key={nb.id}>
                <Link
                  href={`/notebook/${nb.id}`}
                  className="flex h-full flex-col rounded-xl border bg-surface p-5 transition-colors hover:border-border-strong"
                >
                  <BookMarkedIcon className="size-5 text-muted-foreground" />
                  <p className="mt-4 font-medium">{nb.title}</p>
                  {nb.desc && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{nb.desc}</p>}
                  <p className="mt-auto pt-4 text-xs text-muted-foreground tabular-nums">
                    {mine.length} 条笔记 · {sources} 份来源
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
