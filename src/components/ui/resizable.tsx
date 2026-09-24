"use client"

import * as React from "react"
import { Group, Panel, Separator } from "react-resizable-panels"

import { cn } from "@/lib/utils"

/** 可拖拽分栏：桌面端“对话 + 资料预览”并排时使用 */
function ResizableGroup({ className, ...props }: React.ComponentProps<typeof Group>) {
  return <Group data-slot="resizable-group" className={cn("h-full w-full", className)} {...props} />
}

function ResizablePanel(props: React.ComponentProps<typeof Panel>) {
  return <Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        "group relative flex w-px items-center justify-center bg-border outline-none after:absolute after:inset-y-0 after:-left-1.5 after:w-3 hover:bg-primary/60 data-[separator=active]:bg-primary focus-visible:bg-primary",
        className,
      )}
      {...props}
    >
      <span className="z-10 h-8 w-1 rounded-full bg-border-strong opacity-0 transition-opacity group-hover:opacity-100" />
    </Separator>
  )
}

export { ResizableGroup, ResizablePanel, ResizableHandle }
