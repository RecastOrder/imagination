"use client"

import { useRef, useState } from "react"
import {
  ChevronRightIcon,
  CloudDownloadIcon,
  DatabaseIcon,
  HistoryIcon,
  FileIcon,
  FolderSyncIcon,
  HardDriveIcon,
  LoaderCircleIcon,
  UploadCloudIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Meter } from "@/components/ui/meter"
import { useLocalStore } from "@/hooks/use-local-store"
import { formatBytes } from "@/lib/files/checksum"
import { STORAGE_QUOTA_GB, filesStore, groupFiles, type FileGroup, type KbState } from "@/lib/files/store"
import { cn } from "@/lib/utils"
import { BaiduImportSheet } from "./baidu-import-sheet"
import { UploadRow } from "./upload-row"
import { useUploader } from "./use-uploader"

const STEPS = [
  { n: "①", title: "本地分块校验", desc: "每 4 MB 一块，浏览器里算 SHA-256，得到文件指纹" },
  { n: "②", title: "服务器查重", desc: "指纹已存在 → 秒传，不用再传一遍" },
  { n: "③", title: "分块上传", desc: "每块单独核对，坏块自动重传；断网后从断点继续" },
  { n: "④", title: "整体校验", desc: "合并后服务器重算指纹，一致才算上传成功" },
]

/**
 * 我的文件：个人云盘。
 * 入口：拖拽 / 点击选择本地文件、从百度网盘导入。
 * 文件上传后“存着”；点“加入知识库”才会被解析、可被 AI 引用。
 */
export function FilesView() {
  const { items, add, pause, resume, remove, clearFinished } = useUploader()
  const [files, writeFiles] = useLocalStore(filesStore)
  const [dragging, setDragging] = useState(false)
  const [baiduOpen, setBaiduOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  const usedGB = files.reduce((s, f) => s + f.size, 0) / 1024 ** 3
  const groups = groupFiles(files)
  const pickLocal = (list: FileList | null) => {
    if (!list?.length) return
    add(Array.from(list, (f) => ({ name: f.name, size: f.size, file: f, origin: "local" as const })))
  }

  const setKb = (id: string, kb: KbState) => writeFiles((fs) => fs.map((f) => (f.id === id ? { ...f, kb } : f)))

  return (
    <div
      className="relative h-full overflow-y-auto"
      // 整个页面都能接收拖拽，拖进来时显示遮罩提示
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return
        dragDepth.current++
        setDragging(true)
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (!dragDepth.current) setDragging(false)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        dragDepth.current = 0
        setDragging(false)
        pickLocal(e.dataTransfer.files)
      }}
    >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">我的文件</h1>
            <div className="mt-2 flex w-64 items-center gap-3">
              <Meter value={usedGB} max={STORAGE_QUOTA_GB} label="存储用量" />
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {usedGB.toFixed(2)} / {STORAGE_QUOTA_GB} GB
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBaiduOpen(true)}>
              <CloudDownloadIcon />
              从百度网盘导入
            </Button>
            <Button onClick={() => inputRef.current?.click()}>
              <UploadCloudIcon />
              上传文件
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                pickLocal(e.target.files)
                e.target.value = ""
              }}
            />
          </div>
        </div>

        {/* 拖拽区 */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-6 flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-strong bg-surface/50 px-6 py-10 text-center transition-colors hover:border-ring hover:bg-surface"
        >
          <UploadCloudIcon className="size-7 text-muted-foreground" />
          <p className="font-medium">拖拽文件到这里，或点击选择</p>
          <p className="text-sm text-muted-foreground">PDF、DWG、3DM、GH、图片等均可 · 大文件自动分块，支持断点续传</p>
        </button>

        {/* 校验流程说明：让用户相信“传上去的就是原来那份” */}
        <ol className="mt-4 grid gap-2 sm:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-lg bg-surface-sunken px-3 py-2.5">
              <p className="text-sm font-medium">
                <span className="mr-1 text-muted-foreground">{s.n}</span>
                {s.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
            </li>
          ))}
        </ol>

        {items.length > 0 && (
          <section className="mt-8" aria-label="传输队列">
            <div className="mb-2 flex items-center">
              <h2 className="text-sm font-semibold">传输队列</h2>
              <span className="ml-2 text-xs text-muted-foreground">同时处理 2 个文件</span>
              <Button variant="link" size="sm" className="ml-auto h-auto px-0 text-xs" onClick={clearFinished}>
                清除已完成
              </Button>
            </div>
            <ul className="divide-y rounded-xl border bg-surface">
              {items.map((it) => (
                <UploadRow
                  key={it.id}
                  item={it}
                  onPause={() => pause(it.id)}
                  onResume={() => resume(it.id)}
                  onRemove={() => remove(it.id)}
                />
              ))}
            </ul>
          </section>
        )}

        <section className="mt-8" aria-label="文件列表">
          <h2 className="mb-2 text-sm font-semibold">全部文件 · {groups.length}</h2>
          <ul className="divide-y rounded-xl border bg-surface">
            {groups.map((g) => (
              <FileRow
                key={g.name}
                group={g}
                onAddKb={() => {
                  setKb(g.current.id, "parsing")
                  setTimeout(() => setKb(g.current.id, "ready"), 2500)
                }}
              />
            ))}
          </ul>
        </section>

        <div className="mt-8 flex gap-3 rounded-xl border border-dashed p-4">
          <FolderSyncIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">自动上传（规划中）</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              安装桌面同步助手后，指定一个本地文件夹，新增或修改的文件会自动按上面的流程校验上传。
              也可以用 WebDAV 把“我的文件”挂载成电脑上的一个磁盘。
            </p>
          </div>
        </div>
      </div>

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-ring bg-surface px-12 py-10 text-center shadow-float">
            <UploadCloudIcon className="mx-auto size-8 text-primary" />
            <p className="mt-3 font-medium">松开即可上传</p>
          </div>
        </div>
      )}

      <BaiduImportSheet
        open={baiduOpen}
        onOpenChange={setBaiduOpen}
        onImport={(list) => add(list.map((f) => ({ ...f, origin: "baidu" as const })))}
      />
    </div>
  )
}

/**
 * 一个文件 = 一行，显示当前版本；有历史版本时可以展开查看。
 * 历史版本也占用存储空间，所以用量条按所有版本计算。
 */
function FileRow({ group, onAddKb }: { group: FileGroup; onAddKb: () => void }) {
  const [open, setOpen] = useState(false)
  const f = group.current
  const hasHistory = group.history.length > 0
  return (
    <li>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <FileIcon className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span className="truncate">{f.name}</span>
            {(hasHistory || f.version > 1) && (
              <Badge variant="outline" className="font-mono">
                v{f.version}
              </Badge>
            )}
          </p>
          <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
            <span className="tabular-nums">{formatBytes(f.size)}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              {f.origin === "baidu" ? <CloudDownloadIcon className="size-3" /> : <HardDriveIcon className="size-3" />}
              {f.origin === "baidu" ? `百度网盘${f.path ? ` ${f.path}` : ""}` : "本地上传"}
            </span>
            <span>·</span>
            <span className="font-mono" title={`SHA-256 ${f.fingerprint}`}>
              {f.fingerprint.slice(0, 10)}
            </span>
            {hasHistory && (
              <>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setOpen((o) => !o)}
                  aria-expanded={open}
                  className="inline-flex cursor-pointer items-center gap-0.5 hover:text-foreground"
                >
                  <HistoryIcon className="size-3" />
                  历史版本 {group.history.length}
                  <ChevronRightIcon className={cn("size-3 transition-transform", open && "rotate-90")} />
                </button>
              </>
            )}
          </p>
        </div>
        <KbAction state={f.kb} onAdd={onAddKb} />
      </div>
      {open && (
        <ol className="mb-3 ml-11 mr-4 space-y-1 border-l pl-4" aria-label={`${f.name} 的历史版本`}>
          {group.history.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span className="font-mono font-medium text-foreground">v{h.version}</span>
              <span>{new Date(h.uploadedAt).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" })}</span>
              <span>·</span>
              <span className="tabular-nums">{formatBytes(h.size)}</span>
              <span>·</span>
              <span className="font-mono">{h.fingerprint.slice(0, 10)}</span>
            </li>
          ))}
        </ol>
      )}
    </li>
  )
}

function KbAction({ state, onAdd }: { state: KbState; onAdd: () => void }) {
  if (state === "ready")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-success">
        <DatabaseIcon className="size-3.5" />
        已加入知识库
      </span>
    )
  if (state === "parsing")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <LoaderCircleIcon className="size-3.5 animate-spin" />
        解析中…
      </span>
    )
  return (
    <Button variant="outline" size="sm" onClick={onAdd} className={cn("text-xs")} title="解析文字、建立索引后，AI 才能引用这份文件">
      <DatabaseIcon />
      加入知识库
    </Button>
  )
}
