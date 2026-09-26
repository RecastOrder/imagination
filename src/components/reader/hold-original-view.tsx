"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

import { useAccount } from "@/components/account/account-provider"
import { LoadProgress, fetchWithProgress } from "@/components/drive/load-progress"
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
/** className：容器高度。阅读页默认占满视口；右侧抽屉里传 h-full 跟着抽屉走 */
export function HoldOriginalView({ source, className = "h-[calc(100dvh-8rem)]" }: { source: Source; className?: string }) {
  const [state, setState] = useState<{ blob?: Blob; error?: string }>({})
  // 下载与打印只给有权限的人（管理员模板自带，其他人由管理员单独打开）；服务端下载接口还会再查一次
  const canDownload = useAccount().features.original_download
  // 下载进度（owner 2026-09-26「在load 文件的时候，是否可以添加一个进度条，和一个大概的时间」）：
  // 边收边算 —— 已收 / 总大小（hold 回了 content-length 才有百分比）· 速度（最近几秒的平均）· 剩余时间
  const [prog, setProg] = useState<{ got: number; total: number; bps: number }>({ got: 0, total: 0, bps: 0 })
  useEffect(() => {
    let alive = true
    const ctl = new AbortController()
    ;(async () => {
      try {
        const blob = await fetchWithProgress(`/api/sources/${encodeURIComponent(source.id)}/file`, ctl.signal, (p) => alive && setProg(p), (status) =>
          status === 404 ? "这份资料的原件没有找到" : `原件取不到（${status}）`,
        )
        if (alive) setState({ blob })
      } catch (e) {
        if (alive && (e as Error).name !== "AbortError") setState({ error: (e as Error).message })
      }
    })()
    return () => {
      alive = false
      ctl.abort()
    }
  }, [source.id])

  if (state.error) return <p className="py-16 text-center text-sm text-muted-foreground">{state.error}</p>
  if (!state.blob) return <LoadProgress {...prog} />
  return (
    <div data-hold-original className={className}>
      <PdfViewer name={`${source.code ?? source.title}.pdf`} blob={state.blob} src="" fileId={`library:${source.id}`} readOnly
        download={canDownload ? `/api/sources/${encodeURIComponent(source.id)}/file?download=1` : undefined}
        printable={canDownload}
      />
    </div>
  )
}
