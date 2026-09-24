"use client"

import { BookmarkPlusIcon, XIcon } from "lucide-react"

import { useLocalStore } from "@/hooks/use-local-store"
import { PRESET_SCENES, myScenesStore, sameFilters, type Scene } from "@/lib/sources/scenes"
import type { SourceFilters } from "@/lib/sources/types"
import { cn } from "@/lib/utils"

/** 场景条：一键切到常用的筛选组合；右侧是自己保存的视图 */
export function SceneBar({ filters, onChange }: { filters: SourceFilters; onChange: (f: SourceFilters) => void }) {
  const [mine, writeMine] = useLocalStore(myScenesStore)
  const matched = [...PRESET_SCENES, ...mine].find((s) => sameFilters(s.filters, filters))

  const chip = (s: Scene, removable = false) => (
    <span key={s.id} className="group relative inline-flex">
      <button
        type="button"
        title={s.hint}
        aria-pressed={matched?.id === s.id}
        onClick={() => onChange(s.filters)}
        className={cn(
          "h-8 shrink-0 cursor-pointer rounded-full border px-3.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground",
          matched?.id === s.id && "border-primary bg-primary-subtle text-primary-subtle-foreground hover:border-primary hover:text-primary-subtle-foreground",
          removable && "pr-7",
        )}
      >
        {s.label}
      </button>
      {removable && (
        <button
          type="button"
          aria-label={`删除视图 ${s.label}`}
          onClick={() => writeMine((l) => l.filter((x) => x.id !== s.id))}
          className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <XIcon className="size-3" />
        </button>
      )}
    </span>
  )

  return (
    <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="使用场景">
      {PRESET_SCENES.map((s) => chip(s))}
      {mine.length > 0 && <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />}
      {mine.map((s) => chip(s, true))}
      {!matched && (
        <button
          type="button"
          onClick={() => {
            const label = window.prompt("给这个视图起个名字", "我的视图")?.trim()
            if (!label) return
            writeMine((l) => [...l, { id: `my-${Date.now().toString(36)}`, label, filters }])
          }}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-dashed px-3 text-sm whitespace-nowrap text-muted-foreground hover:border-border-strong hover:text-foreground"
        >
          <BookmarkPlusIcon className="size-3.5" />
          保存为我的视图
        </button>
      )}
    </div>
  )
}
