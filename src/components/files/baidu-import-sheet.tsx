"use client"

import { useState } from "react"
import { CheckIcon, CloudIcon, FileIcon, FolderIcon, InfoIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { formatBytes } from "@/lib/files/checksum"
import { cn } from "@/lib/utils"

/** 演示用的网盘目录。真实环境通过百度网盘开放平台的文件列表接口获取 */
const TREE: { folder: string; files: { name: string; size: number }[] }[] = [
  {
    folder: "/我的资料/规范",
    files: [
      { name: "GB 50352-2019 民用建筑设计统一标准.pdf", size: 24_300_000 },
      { name: "GB 50096-2011 住宅设计规范.pdf", size: 9_800_000 },
      { name: "DGJ 08-20 上海市住宅设计标准.pdf", size: 12_600_000 },
    ],
  },
  {
    folder: "/我的资料/图集",
    files: [{ name: "12J201 平屋面建筑构造.pdf", size: 61_200_000 }],
  },
  {
    folder: "/项目/某住宅",
    files: [
      { name: "总平面-v5.dwg", size: 41_000_000 },
      { name: "效果图-鸟瞰.jpg", size: 8_400_000 },
    ],
  },
]

/**
 * 从百度网盘导入：两步——授权 → 选择文件。
 * 只做单向导入（网盘 → 平台），不修改网盘里的任何文件，避免双向同步的冲突问题。
 */
export function BaiduImportSheet({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onImport: (files: { name: string; size: number; path: string }[]) => void
}) {
  const [authorized, setAuthorized] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const key = (folder: string, name: string) => `${folder}/${name}`
  const all = TREE.flatMap((d) => d.files.map((f) => ({ ...f, path: d.folder, k: key(d.folder, f.name) })))
  const chosen = all.filter((f) => picked.has(f.k))
  const total = chosen.reduce((s, f) => s + f.size, 0)

  const toggle = (k: string) =>
    setPicked((p) => {
      const n = new Set(p)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(100%,30rem)] p-0">
        <div className="border-b px-5 pt-5 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <CloudIcon className="size-4" />
            从百度网盘导入
          </SheetTitle>
          <SheetDescription className="mt-1">导入后会重新计算校验值，确保与网盘中的文件一致</SheetDescription>
          {/* 步骤条：让用户知道一共几步、现在在哪一步 */}
          <ol className="mt-4 flex items-center gap-2 text-xs">
            <Step n={1} label="授权账号" state={authorized ? "done" : "current"} />
            <span className="h-px flex-1 bg-border" />
            <Step n={2} label="选择文件" state={authorized ? "current" : "todo"} />
          </ol>
        </div>

        {!authorized ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-surface-sunken">
              <CloudIcon className="size-6 text-muted-foreground" />
            </span>
            <div>
              <p className="font-medium">连接你的百度网盘</p>
              <p className="mt-1 text-sm text-muted-foreground">
                将跳转到百度登录页授权。我们只申请“读取文件列表和下载”权限，不会修改或删除网盘中的文件。
              </p>
            </div>
            <Button onClick={() => setAuthorized(true)}>使用百度账号授权（演示）</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b px-5 py-2.5 text-sm">
              <span className="size-2 rounded-full bg-success" aria-hidden />
              已连接：baidu_user***
              <button type="button" onClick={() => setAuthorized(false)} className="ml-auto cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                断开
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {TREE.map((d) => (
                <div key={d.folder} className="mb-3">
                  <p className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                    <FolderIcon className="size-3.5" />
                    {d.folder}
                  </p>
                  {d.files.map((f) => {
                    const k = key(d.folder, f.name)
                    const on = picked.has(k)
                    return (
                      <button
                        key={k}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => toggle(k)}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                      >
                        <span
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-surface",
                            on && "border-primary bg-primary text-primary-foreground",
                          )}
                        >
                          {on && <CheckIcon className="size-3" strokeWidth={3} />}
                        </span>
                        <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{f.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{formatBytes(f.size)}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
              <p className="mx-2 mt-2 flex gap-2 rounded-md bg-surface-sunken p-3 text-xs leading-relaxed text-muted-foreground">
                <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
                百度网盘对非会员有下载限速，大文件导入可能较慢；可以关掉此页面，导入会在后台继续。
              </p>
            </div>
            <div className="flex items-center gap-3 border-t px-5 py-3">
              <span className="text-sm text-muted-foreground tabular-nums">
                已选 {chosen.length} 个 · {formatBytes(total)}
              </span>
              <Button
                className="ml-auto"
                disabled={!chosen.length}
                onClick={() => {
                  onImport(chosen.map(({ name, size, path }) => ({ name, size, path })))
                  setPicked(new Set())
                  onOpenChange(false)
                }}
              >
                导入
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Step({ n, label, state }: { n: number; label: string; state: "done" | "current" | "todo" }) {
  return (
    <li className={cn("flex items-center gap-1.5", state === "todo" && "text-muted-foreground")}>
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full border text-[11px] font-semibold",
          state === "current" && "border-primary bg-primary text-primary-foreground",
          state === "done" && "border-success text-success",
        )}
      >
        {state === "done" ? <CheckIcon className="size-3" strokeWidth={3} /> : n}
      </span>
      {label}
    </li>
  )
}
