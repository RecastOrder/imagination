"use client"

import { useEffect, useState, type ComponentType } from "react"
import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"
import { readArchiveEntry } from "@/lib/drive/archive"
import { formatOf, type ViewerKey } from "@/lib/drive/formats"
import type { DriveFile } from "@/lib/drive/types"
import { ImageViewer } from "./viewers/image-viewer"
import { AudioViewer, VideoViewer } from "./viewers/media-viewer"
import { PendingViewer } from "./viewers/pending-viewer"
import { TextViewer } from "./viewers/text-viewer"
import type { ViewerProps } from "./viewers/types"

const loading = () => <Skeleton className="m-8 h-[60vh]" />
// PDF.js 和 three.js 体积大，只在真正打开这类文件时才下载（代码分割）
const PdfViewer = dynamic(() => import("./viewers/pdf-viewer").then((m) => m.PdfViewer), { ssr: false, loading })
const OfficeViewer = dynamic(() => import("./viewers/office-viewer").then((m) => m.OfficeViewer), { ssr: false, loading })
const ModelViewer = dynamic(() => import("./viewers/model-viewer").then((m) => m.ModelViewer), { ssr: false, loading })

/**
 * 查看器注册表：格式 → 查看器组件（和对话里的“内容块注册表”是同一个思路）。
 * 新增一种格式 = 在 lib/drive/formats.ts 登记 + 在这里注册一个组件。
 */
const REGISTRY: Partial<Record<ViewerKey, ComponentType<ViewerProps>>> = {
  pdf: PdfViewer,
  office: OfficeViewer,
  image: ImageViewer,
  markdown: TextViewer,
  text: TextViewer,
  table: TextViewer,
  model: ModelViewer,
  video: VideoViewer,
  audio: AudioViewer,
}

/** 取回文件内容（普通文件走网址，压缩包里的文件现解压），再交给对应的查看器 */
export function ViewerHost({
  file,
  archiveUrl,
  readOnly,
}: {
  file: DriveFile
  archiveUrl?: (archiveId: string) => string | undefined
  /** 仅浏览：查看器不显示标注工具 */
  readOnly?: boolean
}) {
  const format = formatOf(file.name)
  const Viewer = REGISTRY[format.viewer]
  const [state, setState] = useState<{ id: string; blob: Blob; src: string } | { id: string; error: string } | null>(null)

  useEffect(() => {
    if (!Viewer) return
    let alive = true
    let src = ""
    ;(async () => {
      try {
        let blob: Blob
        if (file.zip) {
          const url = archiveUrl?.(file.zip.archiveId)
          if (!url) throw new Error("找不到所在的压缩包")
          blob = await readArchiveEntry(file.zip.archiveId, url, file.zip.path)
        } else {
          const r = await fetch(file.url!)
          if (!r.ok) throw new Error(`文件读取失败（${r.status}）`)
          blob = await r.blob()
        }
        src = URL.createObjectURL(blob)
        if (alive) setState({ id: file.id, blob, src })
        else URL.revokeObjectURL(src)
      } catch (e) {
        if (alive) setState({ id: file.id, error: (e as Error).message || "文件读取失败" })
      }
    })()
    return () => {
      alive = false
      if (src) URL.revokeObjectURL(src)
    }
  }, [file, Viewer, archiveUrl])

  if (!Viewer) return <PendingViewer name={file.name} size={file.size} href={file.url} />
  if (!state || state.id !== file.id) return <Skeleton className="m-8 h-[60vh]" />
  if ("error" in state) return <p className="p-8 text-center text-sm text-destructive">{state.error}</p>
  return <Viewer key={file.id} fileId={file.id} name={file.name} blob={state.blob} src={state.src} readOnly={readOnly} />
}
