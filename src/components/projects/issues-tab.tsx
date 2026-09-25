"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2Icon, CircleDotIcon, MessageSquareIcon } from "lucide-react"

import { Segmented } from "@/components/ui/segmented"
import type { Issue } from "@/lib/drive/issues"
import { cn } from "@/lib/utils"

/**
 * 项目里所有的问题（来自各个项目文件）：
 * 标注平时只有自己看得到，想让大家看的才“发起为问题”，所以这里就是需要一起处理的事项清单。
 * 点一条直接打开文件并定位到那个位置。
 */
export function IssuesTab({ issues }: { issues: Issue[] }) {
  const [filter, setFilter] = useState<"open" | "closed">("open")
  const open = issues.filter((i) => i.status === "open")
  const list = filter === "open" ? open : issues.filter((i) => i.status === "closed")

  if (issues.length === 0)
    return (
      <div className="rounded-xl border border-dashed px-6 py-14 text-center">
        <p className="font-medium">还没有问题</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          在“项目文件”里打开图纸，画标注后点“发起问题”，项目成员就能在这里看到并回复。平时的标注只有自己看得到。
        </p>
      </div>
    )

  return (
    <div className="space-y-4">
      <Segmented
        label="问题状态"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "open", label: `进行中 ${open.length}` },
          { value: "closed", label: `已关闭 ${issues.length - open.length}` },
        ]}
      />
      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {filter === "open" ? "没有进行中的问题" : "没有已关闭的问题"}
        </p>
      ) : (
        <ul className="divide-y rounded-xl border bg-surface">
          {list.map((i) => {
            const Icon = i.status === "open" ? CircleDotIcon : CheckCircle2Icon
            return (
              <li key={i.id}>
                <Link
                  href={`/browse?f=${encodeURIComponent(i.fileId)}&issue=${encodeURIComponent(i.id)}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-accent/50"
                >
                  <Icon className={cn("mt-0.5 size-4 shrink-0", i.status === "open" ? "text-markup" : "text-muted-foreground")} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">
                      <span className="font-medium tabular-nums">#{i.number}</span> {i.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {i.fileName} · 第 {i.mark.page} 页 · {i.authorName} · {new Date(i.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                  </span>
                  {i.replies.length > 0 && (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquareIcon className="size-3.5" />
                      {i.replies.length}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
