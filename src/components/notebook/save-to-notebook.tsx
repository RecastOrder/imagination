"use client"

import { useState } from "react"
import { BookMarkedIcon, CheckIcon, PlusIcon } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "@/components/ui/toast"
import { useLocalStore } from "@/hooks/use-local-store"
import {
  activeNotebookPref,
  addNote,
  createNotebook,
  notebooksStore,
  type Note,
} from "@/lib/notebook/store"

/**
 * “存入笔记本”弹出菜单。默认选中最近用过的笔记本（减少一次选择），
 * 也可以当场新建一个。对话、阅读器、样张页共用。
 */
export function SaveToNotebook({
  note,
  children,
  onSaved,
  onOpenChange,
  side = "bottom",
}: {
  note: () => Omit<Note, "id" | "createdAt" | "notebookId">
  children: React.ReactNode
  onSaved?: () => void
  onOpenChange?: (open: boolean) => void
  side?: "top" | "bottom"
}) {
  const [open, setOpenState] = useState(false)
  const setOpen = (o: boolean) => {
    setOpenState(o)
    onOpenChange?.(o)
  }
  const [notebooks] = useLocalStore(notebooksStore)
  const [active] = useLocalStore(activeNotebookPref)
  const [creating, setCreating] = useState(false)

  const save = (notebookId: string, title: string) => {
    addNote({ ...note(), notebookId })
    setOpen(false)
    onSaved?.()
    toast(`已存入「${title}」`, { href: `/notebook/${notebookId}`, linkLabel: "打开笔记本" })
  }

  return (
    <Popover open={open} onOpenChange={(o) => (setOpen(o), setCreating(false))}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side={side} align="start" onMouseDown={(e) => e.stopPropagation()}>
        <p className="flex items-center gap-1.5 px-2 pt-1 pb-2 text-xs font-medium text-muted-foreground">
          <BookMarkedIcon className="size-3.5" />
          存入笔记本
        </p>
        {notebooks.map((nb) => (
          <button
            key={nb.id}
            type="button"
            onClick={() => save(nb.id, nb.title)}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
          >
            <span className="min-w-0 flex-1 truncate">{nb.title}</span>
            {nb.id === active && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <CheckIcon className="size-3" />
                最近
              </span>
            )}
          </button>
        ))}
        <div className="mt-1 border-t pt-1">
          {creating ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const title = new FormData(e.currentTarget).get("title")?.toString().trim()
                if (!title) return
                const nb = createNotebook(title)
                save(nb.id, nb.title)
              }}
            >
              <input
                name="title"
                autoFocus
                placeholder="笔记本名称，如：某某项目"
                className="h-8 w-full rounded-md border border-input bg-surface px-2 text-sm outline-none focus:border-ring"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <PlusIcon className="size-3.5" />
              新建笔记本
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
