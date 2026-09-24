"use client"

import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CloudDownloadIcon,
  FileIcon,
  PauseIcon,
  PlayIcon,
  RotateCwIcon,
  XIcon,
  ZapIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatBytes } from "@/lib/files/checksum"
import { cn } from "@/lib/utils"
import type { Stage, UploadItem } from "./use-uploader"

const STAGE_LABEL: Record<Stage, string> = {
  queued: "排队中",
  fetching: "从百度网盘拉取",
  hashing: "计算校验值",
  checking: "服务器查重",
  uploading: "分块上传",
  verifying: "完整性校验",
  done: "已完成",
  instant: "秒传完成",
  paused: "已暂停",
  error: "失败",
}

/** 上传队列中的一行：阶段、进度、细节、操作 */
export function UploadRow({
  item,
  onPause,
  onResume,
  onRemove,
}: {
  item: UploadItem
  onPause: () => void
  onResume: () => void
  onRemove: () => void
}) {
  const { stage } = item
  const finished = stage === "done" || stage === "instant"
  const active = !finished && stage !== "paused" && stage !== "error" && stage !== "queued"

  // 整体进度：本地文件 = 计算校验 30% + 上传 70%；网盘 = 拉取 100%
  const progress = finished
    ? 1
    : item.origin === "baidu"
      ? item.transferred / item.chunksTotal
      : (item.hashed / item.chunksTotal) * 0.3 + (item.transferred / item.chunksTotal) * 0.7

  const detail = (() => {
    const s = stage === "paused" ? item.resumeStage : stage
    switch (s) {
      case "hashing":
        return `第 ${item.hashed} / ${item.chunksTotal} 块 · SHA-256`
      case "checking":
        return `指纹 ${item.fingerprint?.slice(0, 12)}… 比对中`
      case "uploading":
        return `${item.transferred} / ${item.chunksTotal} 块${item.speed ? ` · ${item.speed.toFixed(0)} MB/s` : ""}`
      case "fetching":
        return `${item.transferred} / ${item.chunksTotal} 块${item.speed ? ` · ${item.speed.toFixed(1)} MB/s（网盘限速）` : ""}`
      case "verifying":
        return "服务器重新计算整个文件的指纹并比对"
      default:
        return ""
    }
  })()

  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-muted-foreground",
            finished && "text-success",
            stage === "error" && "text-destructive",
          )}
        >
          {stage === "instant" ? (
            <ZapIcon className="size-4" />
          ) : finished ? (
            <CheckCircle2Icon className="size-4" />
          ) : stage === "error" ? (
            <AlertCircleIcon className="size-4" />
          ) : item.origin === "baidu" ? (
            <CloudDownloadIcon className="size-4" />
          ) : (
            <FileIcon className="size-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="truncate text-sm font-medium">{item.name}</p>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatBytes(item.size)}</span>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className={cn("font-medium", active && "text-foreground", finished && "text-success", stage === "error" && "text-destructive")}>
              {STAGE_LABEL[stage]}
            </span>
            {detail && <span className="tabular-nums">{detail}</span>}
            {stage === "instant" && <span>{item.note ?? "服务器已有内容完全相同的文件，无需再传"}</span>}
            {stage === "done" && item.fingerprint && (
              <span className="font-mono" title={item.fingerprint}>
                SHA-256 {item.fingerprint.slice(0, 16)}…
              </span>
            )}
            {item.retries > 0 && (
              <span className="text-warning">
                第 {item.lastRetryChunk} 块校验不一致，已自动重传（共 {item.retries} 次）
              </span>
            )}
            {item.error && <span className="text-destructive">{item.error}</span>}
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5">
          {active && (
            <Button variant="ghost" size="icon-sm" onClick={onPause} aria-label="暂停">
              <PauseIcon />
            </Button>
          )}
          {stage === "paused" && (
            <Button variant="ghost" size="icon-sm" onClick={onResume} aria-label="继续（从断点续传）" title="从断点续传">
              <PlayIcon />
            </Button>
          )}
          {stage === "error" && (
            <Button variant="ghost" size="icon-sm" onClick={onResume} aria-label="重试">
              <RotateCwIcon />
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label={finished ? "从列表移除" : "取消"}>
            <XIcon />
          </Button>
        </div>
      </div>
      {!finished && (
        <div className="mt-2 ml-12 h-1 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${item.name} 进度`}>
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-200",
              stage === "paused" ? "bg-muted-foreground/50" : stage === "error" ? "bg-destructive" : "bg-foreground/70",
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </li>
  )
}
