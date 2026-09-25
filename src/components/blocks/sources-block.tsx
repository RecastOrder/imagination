"use client"

import { SourceCard } from "@/components/source/source-card"
import { useSourceList } from "@/hooks/use-sources"
import type { BlockProps } from "./registry"

export function SourcesBlock({ block, ctx }: BlockProps<"sources">) {
  const { sources: all } = useSourceList()
  const sources = block.sourceIds.map((id) => all.find((s) => s.id === id)).filter((s) => !!s)
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">参考资料 · {sources.length}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {sources.map((s, i) => (
          <SourceCard
            key={s.id}
            source={s}
            index={i + 1}
            density="compact"
            active={ctx.peekId === s.id}
            onOpen={ctx.openPeek}
          />
        ))}
      </div>
    </div>
  )
}
