"use client"

import { ImageIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { BlockProps } from "./registry"

/** 占位色块（只用语义令牌，不写原始色）。接入真实图片后删除 */
const TONES = [
  "from-border-strong to-muted-foreground/60",
  "from-primary-subtle to-border-strong",
  "from-surface-sunken to-border",
  "from-muted to-muted-foreground/40",
]

/**
 * 图片结果：和“资料卡片”是同一种交互——点击打开预览。
 * 这就是“搜图片和对话有相似性”的落点：结果长得不同，交互是同一套。
 */
export function ImagesBlock({ block, ctx }: BlockProps<"images">) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {block.images.map((img) => (
        <button
          key={img.id}
          type="button"
          onClick={() => img.sourceId && ctx.openPeek(img.sourceId)}
          className="group cursor-pointer text-left outline-none"
        >
          <span
            className={cn(
              "flex aspect-[4/3] items-center justify-center rounded-lg bg-gradient-to-br ring-primary/60 transition group-hover:brightness-95 group-focus-visible:ring-[3px]",
              TONES[img.tone % TONES.length],
              img.sourceId && ctx.peekId === img.sourceId && "ring-2",
            )}
          >
            <ImageIcon className="size-5 text-foreground/30" />
          </span>
          <span className="mt-1.5 block truncate text-xs text-muted-foreground">{img.caption}</span>
        </button>
      ))}
    </div>
  )
}
