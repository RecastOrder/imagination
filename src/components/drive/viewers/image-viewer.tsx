"use client"

import { useEffect, useRef, useState } from "react"
import { MaximizeIcon, ScanIcon } from "lucide-react"

import { Segmented } from "@/components/ui/segmented"
import { useAnnotator } from "../annotate/annotator"
import type { ViewerProps } from "./types"

/**
 * 图片：“适应窗口”看全貌，“原始大小”看细节（可滚动平移）。
 * 同样可以标注和测量（页面单位是图片原始像素，校准后换算成毫米）。
 */
export function ImageViewer({ fileId, name, src, readOnly, focusIssue }: ViewerProps) {
  const [mode, setMode] = useState<"fit" | "actual">("fit")
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  const [shown, setShown] = useState(0)
  const imgRef = useRef<HTMLImageElement>(null)
  const annot = useAnnotator({ fileId, fileName: name, unit: "px", readOnly, focusIssue })

  // 图片实际显示的宽度：用来换算标注的线宽和字号
  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    const ro = new ResizeObserver(() => setShown(img.clientWidth))
    ro.observe(img)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-1.5">
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
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        {annot.toolbar}
        {dims && <span className="ml-auto text-xs text-muted-foreground tabular-nums">{dims.w} × {dims.h} 像素</span>}
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-auto bg-surface-sunken">
          <div className={mode === "fit" ? "flex h-full items-center justify-center p-6" : "w-max p-6"}>
            <div className="relative inline-block max-h-full max-w-full leading-none shadow-float">
              {/* eslint-disable-next-line @next/next/no-img-element -- 用户文件，尺寸未知，不走 next/image 优化 */}
              <img
                ref={imgRef}
                src={src}
                alt={name}
                draggable={false}
                onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                className={mode === "fit" ? "block max-h-[calc(100dvh-10rem)] max-w-full object-contain" : "block max-w-none"}
              />
              {dims && shown > 0 && annot.layer(1, dims.w, dims.h, shown / dims.w)}
            </div>
          </div>
        </div>
        {annot.panel}
      </div>
      {annot.dialog}
    </div>
  )
}
