"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { InfoIcon, LoaderCircleIcon } from "lucide-react"

import { extOf } from "@/lib/drive/formats"
import type { ViewerProps } from "./types"

const PdfViewer = dynamic(() => import("./pdf-viewer").then((m) => m.PdfViewer), { ssr: false })

/**
 * Office（Word / Excel / PPT / WPS）：
 * 浏览器本身不会排版 Office 文件，所以把文件交给我们自己服务器上的 LibreOffice 转成 PDF，
 * 再用 PDF 查看器显示——同样可以标注、测量。只读；要修改请下载后用 Office / WPS 打开。
 * 同一个文件只转换一次（服务器按内容指纹缓存）。
 */
export function OfficeViewer(props: ViewerProps) {
  const { name, blob } = props
  const [pdf, setPdf] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const ctrl = new AbortController()
    ;(async () => {
      try {
        const r = await fetch(`/api/preview/office?ext=${encodeURIComponent(extOf(name))}`, {
          method: "POST",
          body: blob,
          signal: ctrl.signal,
        })
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? "转换失败")
        const out = await r.blob()
        if (alive) setPdf(out)
      } catch (e) {
        if (alive && (e as Error).name !== "AbortError") setError((e as Error).message)
      }
    })()
    return () => {
      alive = false
      ctrl.abort()
    }
  }, [blob, name])

  if (error) return <p className="p-8 text-center text-sm text-destructive">{error}</p>
  if (!pdf)
    return (
      <p className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
        <LoaderCircleIcon className="size-4 animate-spin" />
        正在生成预览（第一次打开需要几秒）…
      </p>
    )
  return (
    <PdfViewer
      {...props}
      blob={pdf}
      banner={
        <p className="flex items-center gap-1.5 border-b bg-surface-sunken px-4 py-1.5 text-xs text-muted-foreground">
          <InfoIcon className="size-3.5" />
          Office 预览（只读，由服务器转换为 PDF 显示）。需要修改时请下载后用 Office 或 WPS 打开。
        </p>
      }
    />
  )
}
