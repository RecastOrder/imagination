"use client"

import { useState } from "react"
import { CheckIcon, FolderPlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "@/components/ui/toast"
import { useAccount } from "@/components/account/account-provider"
import { useLocalStore } from "@/hooks/use-local-store"
import { REF_CATEGORIES, addProjectRef, lastProjectPref, type ProjectRef, type RefCategory } from "@/lib/projects/refs"
import { cn } from "@/lib/utils"

/**
 * “加入项目”：把当前看到的内容收进某个项目的依据清单。
 * 默认选中最近用过的项目；选个分类、可写一句为什么加。
 * 只收集，不审核——用不用、怎么用由项目成员自己判断。
 */
export function AddToProject({
  item,
  defaultCategory = "规范依据",
  children,
  side = "bottom",
  onOpenChange,
  onAdded,
}: {
  item: () => Pick<ProjectRef, "title" | "text" | "sourceId" | "sectionId">
  defaultCategory?: RefCategory
  children: React.ReactNode
  side?: "top" | "bottom"
  onOpenChange?: (o: boolean) => void
  onAdded?: () => void
}) {
  const { projects: all } = useAccount()
  const [busy, setBusy] = useState(false)
  // 只列出我能编辑的项目：“仅浏览”的项目不能往里加内容
  const projects = all.filter((p) => p.canEdit)
  const [last] = useLocalStore(lastProjectPref)
  const [open, setOpenState] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [category, setCategory] = useState<RefCategory>(defaultCategory)
  const [note, setNote] = useState("")
  const current = projectId ?? (projects.some((p) => p.id === last) ? last : projects[0]?.id)

  const setOpen = (o: boolean) => {
    setOpenState(o)
    onOpenChange?.(o)
    if (!o) {
      setNote("")
      setProjectId(null)
      setCategory(defaultCategory)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side={side} align="start" className="w-72 p-3" onMouseDown={(e) => e.stopPropagation()}>
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <FolderPlusIcon className="size-3.5" />
          加入项目依据清单
        </p>
        {projects.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {all.length === 0 ? "你还没有参与任何项目。" : "你参与的项目都是“仅浏览”权限，不能加入内容。需要时请联系项目负责人。"}
          </p>
        ) : (
          <form
            className="mt-3 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!current || busy) return
              setBusy(true)
              try {
                await addProjectRef(current, { ...item(), category, note: note.trim() || undefined })
                setOpen(false)
                onAdded?.()
                toast(`已加入「${projects.find((p) => p.id === current)?.name}」· ${category}`, {
                  href: `/projects/${current}?tab=refs`,
                  linkLabel: "查看清单",
                })
              } catch (err) {
                toast((err as Error).message)
              } finally {
                setBusy(false)
              }
            }}
          >
            <div className="space-y-0.5">
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProjectId(p.id)}
                  aria-pressed={p.id === current}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                    p.id === current && "bg-primary-subtle text-primary-subtle-foreground hover:bg-primary-subtle",
                  )}
                >
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.id === current && <CheckIcon className="size-3.5" />}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {REF_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={c === category}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "h-7 cursor-pointer rounded-full border px-2.5 text-xs text-muted-foreground hover:border-border-strong hover:text-foreground",
                    c === category && "border-primary bg-primary-subtle text-primary-subtle-foreground",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="为什么加这条（可选）"
              className="h-8 w-full rounded-md border border-input bg-surface px-2 text-sm outline-none focus:border-ring"
            />
            <Button type="submit" size="sm" className="w-full" disabled={busy}>
              加入
            </Button>
          </form>
        )}
      </PopoverContent>
    </Popover>
  )
}
