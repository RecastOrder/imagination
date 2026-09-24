"use client"

import { LightbulbIcon } from "lucide-react"

import { getSource } from "@/lib/sources/mock"
import type { BlockProps } from "./registry"

/**
 * 联想块：虚线边框 + “联想”标签。
 * 和有出处的正文在视觉上明确分开，用户一眼能看出“哪句能写进说明，哪句只是启发”。
 */
export function IdeaBlock({ block, ctx }: BlockProps<"idea">) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <LightbulbIcon className="size-3.5" />
        联想 · 仅供启发，没有权威出处
      </p>
      <p className="mt-2 text-[15px] leading-[1.75]">{block.content}</p>
      {block.refs?.length ? (
        <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          灵感来源：
          {block.refs.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => ctx.openPeek(id)}
              className="cursor-pointer underline decoration-dotted underline-offset-2 hover:text-foreground"
            >
              {getSource(id)?.title}
            </button>
          ))}
        </p>
      ) : null}
    </div>
  )
}
