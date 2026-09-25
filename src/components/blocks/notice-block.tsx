"use client"

import { AlertTriangleIcon, InfoIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CHAT_MODES } from "@/lib/chat/modes"
import { cn } from "@/lib/utils"
import type { BlockProps } from "./registry"

/** 提示块：找不到出处（info）、引用的规范已被替代（warning） */
export function NoticeBlock({ block, ctx }: BlockProps<"notice">) {
  const Icon = block.tone === "warning" ? AlertTriangleIcon : InfoIcon
  return (
    <div
      role={block.tone === "warning" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-lg border px-4 py-3",
        block.tone === "warning" ? "border-warning/40 bg-warning/8" : "bg-surface-sunken",
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", block.tone === "warning" ? "text-warning" : "text-muted-foreground")} />
      <div className="min-w-0">
        <p className="text-sm font-medium">{block.title}</p>
        <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{block.content}</p>
        {block.action && ctx.onSwitchMode && (
          <Button variant="outline" size="sm" className="mt-3" onClick={() => ctx.onSwitchMode!(block.action!.switchTo)}>
            {(() => {
              const I = CHAT_MODES[block.action.switchTo].icon
              return <I />
            })()}
            {block.action.label}
          </Button>
        )}
      </div>
    </div>
  )
}
