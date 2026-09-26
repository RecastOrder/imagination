"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import type { Source } from "@/lib/sources/types"

// PDF.js 体积大：按需加载（项目约定）
const PdfViewer = dynamic(() => import("@/components/drive/viewers/pdf-viewer").then((m) => m.PdfViewer), {
  ssr: false,
  loading: () => <Skeleton className="mx-auto h-[70vh] w-full max-w-3xl" />,
})

/**
 * 原版视图（hold 上的规范 / 图集）：取回原件 PDF，交给文件浏览里同一个 PDF.js 查看器渲染。
 * 只读：资料库的原件不能在这里批注成「问题」，只能看、量。
 */
export function HoldOriginalView({ source }: { source: Source }) {
  const [state, setState] = useState<{ blob?: Blob; error?: string }>({})
  useEffect(() => {
    let alive = true
    fetch(`/api/sources/${encodeURIComponent(source.id)}/file`)
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "这份资料的原件没有找到" : `原件取不到（${r.status}）`)
        return r.blob()
      })
      .then(
        (blob) => alive && setState({ blob }),
        (e: Error) => alive && setState({ error: e.message }),
      )
    return () => {
      alive = false
    }
  }, [source.id])

  if (state.error) return <p className="py-16 text-center text-sm text-muted-foreground">{state.error}</p>
  if (!state.blob) return <p className="py-16 text-center text-sm text-muted-foreground">正在取原件…（大的规范有几十 MB，要等一会儿）</p>
  return (
    <div data-hold-original className="h-[calc(100dvh-8rem)]">
      <PdfViewer name={`${source.code ?? source.title}.pdf`} blob={state.blob} src="" fileId={`library:${source.id}`} readOnly />
    </div>
  )
}
