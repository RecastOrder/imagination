"use client"

import { useState } from "react"
import { MaximizeIcon, ScanIcon } from "lucide-react"

import { Segmented } from "@/components/ui/segmented"
import type { ViewerProps } from "./types"

/** 图片：“适应窗口”看全貌，“原始大小”看细节（可滚动平移） */
export function ImageViewer({ name, src }: ViewerProps) {
  const [mode, setMode] = useState<"fit" | "actual">("fit")
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <Segmented
          label="显示方式"
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: "fit", label: <><ScanIcon />适应窗口</> },
            { value: "actual", label: <><MaximizeIcon />原始大小</> },
          ]}
        />
        {dims && <span className="text-xs text-muted-foreground tabular-nums">{dims.w} × {dims.h} 像素</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-surface-sunken">
        <div className={mode === "fit" ? "flex h-full items-center justify-center p-6" : "p-6"}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 用户文件，尺寸未知，不走 next/image 优化 */}
          <img
            src={src}
            alt={name}
            onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            className={mode === "fit" ? "max-h-full max-w-full object-contain shadow-float" : "max-w-none shadow-float"}
          />
        </div>
      </div>
    </div>
  )
}
