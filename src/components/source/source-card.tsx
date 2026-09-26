"use client"

import type { SourceMeta as SourceMetaData } from "@/lib/sources/types"
import { cn } from "@/lib/utils"
import { SourceKindIcon } from "./source-kind-badge"
import { SourceMeta } from "./source-meta"

/**
 * 资料卡片：对话里的“引用来源”和资料库的“检索结果”用的是同一个组件，
 * 只是 density（密度）不同。点击 → 打开右侧预览（不跳页）。
 */
export function SourceCard({
  source,
  index,
  active,
  density = "comfortable",
  onOpen,
}: {
  source: SourceMetaData
  /** 在对话里显示引用编号 [1] */
  index?: number
  active?: boolean
  density?: "compact" | "comfortable"
  onOpen: (id: string) => void
}) {
  return (
    <button
      type="button"
      data-source-id={source.id}
      onClick={() => onOpen(source.id)}
      aria-current={active || undefined}
      className={cn(
        "group flex w-full cursor-pointer items-start gap-3 rounded-lg border bg-surface text-left transition-colors outline-none hover:border-border-strong hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/40",
        density === "compact" ? "p-2.5" : "p-4",
        active && "border-primary/60 bg-primary-subtle/50 hover:border-primary/60 hover:bg-primary-subtle/60",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-surface-sunken text-muted-foreground",
          density === "compact" ? "size-8" : "size-10",
          active && "text-primary",
        )}
      >
        {index !== undefined ? (
          <span className="text-xs font-semibold tabular-nums">{index}</span>
        ) : (
          <SourceKindIcon kind={source.kind} className="size-4" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={cn("truncate font-medium", density === "compact" ? "text-sm" : "text-[15px]")}>
            {source.title}
          </span>
          {!!source.opens && (
            <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums" title="被打开的次数：资料库按它从多到少排">
              打开 {source.opens} 次
            </span>
          )}
        </span>
        <SourceMeta source={source} className="mt-0.5" />
        {density === "comfortable" && (
          <span className="mt-2 line-clamp-2 block text-sm text-muted-foreground">{source.summary}</span>
        )}
      </span>
    </button>
  )
}
