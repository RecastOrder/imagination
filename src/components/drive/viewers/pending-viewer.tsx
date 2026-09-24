import { DownloadIcon, FileClockIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatBytes } from "@/lib/files/checksum"
import { SUPPORT_LABEL, formatOf } from "@/lib/drive/formats"

/**
 * 暂时不能预览的格式：不给“空白”或报错，而是说明
 * ① 这是什么格式 ② 什么时候能看、怎么实现 ③ 现在能做什么（下载后用本机程序打开）。
 * 这是“逐级降级”的最后一级。
 */
export function PendingViewer({ name, size, href }: { name: string; size?: number; href?: string }) {
  const f = formatOf(name)
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-surface p-6 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-surface-sunken">
          <FileClockIcon className="size-6 text-muted-foreground" />
        </span>
        <p className="mt-4 font-medium break-all">{name}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {f.label}
          {size !== undefined && ` · ${formatBytes(size)}`} · {SUPPORT_LABEL[f.support]}
        </p>
        {f.note && <p className="mt-4 rounded-lg bg-surface-sunken px-4 py-3 text-left text-sm leading-relaxed">{f.note}</p>}
        {href && (
          <Button asChild variant="outline" className="mt-5">
            <a href={href} download={name}>
              <DownloadIcon />
              下载，用本机程序打开
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}
