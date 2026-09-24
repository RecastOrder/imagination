"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getSource } from "@/lib/sources/mock"
import { cn } from "@/lib/utils"

/** 引用编号 [1]：第一级“看到”。悬停显示标题，点击打开右侧预览 */
export function Citation({
  n,
  sourceId,
  active,
  onOpen,
}: {
  n: number
  sourceId: string
  active?: boolean
  onOpen: (id: string) => void
}) {
  const source = getSource(sourceId)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => onOpen(sourceId)}
          className={cn(
            "mx-0.5 inline-flex h-[18px] min-w-[18px] cursor-pointer items-center justify-center rounded-sm bg-secondary px-1 align-[2px] text-[11px] font-semibold tabular-nums text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground",
            active && "bg-primary text-primary-foreground",
          )}
          aria-label={`引用 ${n}：${source?.title ?? ""}`}
        >
          {n}
        </button>
      </TooltipTrigger>
      {source && <TooltipContent>{source.title}</TooltipContent>}
    </Tooltip>
  )
}
