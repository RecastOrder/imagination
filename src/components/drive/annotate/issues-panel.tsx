"use client"

import { useState } from "react"
import { CheckCircle2Icon, CircleDotIcon, RotateCcwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { useAccount } from "@/components/account/account-provider"
import { distance, formatLength } from "@/lib/drive/annotations"
import { ISSUE_STATUS, type Issue } from "@/lib/drive/issues"
import { cn } from "@/lib/utils"
import type { IssuesApi } from "./use-issues"

const when = (t: number) => new Date(t).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })

/**
 * 问题列表（像 GitHub Issues / Figma 评论的精简版）：
 * 进行中的在前；点开一条看讨论、回复；有编辑权限的人（或发起人）可以关闭 / 重新打开。
 */
export function IssuesPanel({
  api,
  canEdit,
  selectedId,
  onSelect,
  onJump,
}: {
  api: IssuesApi
  canEdit: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
  onJump: (i: Issue) => void
}) {
  const { email } = useAccount()
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const list = [...api.issues].sort((a, b) => (a.status === b.status ? a.number - b.number : a.status === "open" ? -1 : 1))

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      return true
    } catch (e) {
      toast((e as Error).message)
      return false
    } finally {
      setBusy(false)
    }
  }

  if (!api.loaded) return <p className="p-6 text-center text-sm text-muted-foreground">正在读取…</p>
  if (list.length === 0)
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        这个文件还没有问题。
        {canEdit && (
          <>
            <br />
            在“我的标注”里选一条，点“发起问题”，能看这个文件的人就都能看到并回复。
          </>
        )}
      </p>
    )

  return (
    <ul className="min-h-0 flex-1 overflow-y-auto p-2">
      {list.map((i) => {
        const sel = i.id === selectedId
        const Icon = i.status === "open" ? CircleDotIcon : CheckCircle2Icon
        const m = i.mark
        return (
          <li key={i.id} className={cn("rounded-lg border border-transparent p-2", sel && "border-border bg-surface-sunken")}>
            <button
              type="button"
              onClick={() => {
                onSelect(sel ? null : i.id)
                if (!sel) onJump(i)
              }}
              className="flex w-full cursor-pointer items-start gap-2 text-left"
              aria-expanded={sel}
            >
              <Icon className={cn("mt-0.5 size-3.5 shrink-0", i.status === "open" ? "text-markup" : "text-muted-foreground")} aria-label={ISSUE_STATUS[i.status]} />
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm", i.status === "closed" && "text-muted-foreground line-through")}>
                  <span className="font-medium tabular-nums">#{i.number}</span> {i.title}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {i.authorName} · 第 {m.page} 页 · {when(i.createdAt)}
                  {i.replies.length > 0 && ` · ${i.replies.length} 条回复`}
                </span>
              </span>
            </button>
            {sel && (
              <div className="mt-2 space-y-2 pl-5.5">
                {m.kind === "measure" && (
                  <p className="text-xs text-muted-foreground">测量：{formatLength(distance(m.x1, m.y1, m.x2, m.y2), i.scale)}</p>
                )}
                {m.text && m.text !== i.title && <p className="text-sm whitespace-pre-wrap">{m.text}</p>}
                {i.replies.length > 0 && (
                  <ul className="space-y-2 border-l-2 pl-3">
                    {i.replies.map((r) => (
                      <li key={r.id}>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{r.authorName}</span> · {when(r.at)}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{r.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {i.status === "closed" && i.closedAt && <p className="text-xs text-muted-foreground">已于 {when(i.closedAt)} 关闭</p>}
                <form
                  className="space-y-1.5"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    if (!draft.trim()) return
                    if (await run(() => api.reply(i.id, draft))) setDraft("")
                  }}
                >
                  <textarea
                    rows={2}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="回复…"
                    aria-label={`回复问题 #${i.number}`}
                    className="block w-full resize-none rounded-md border border-input bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-ring"
                  />
                  <div className="flex items-center gap-1">
                    {(canEdit || i.author === email) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        className="text-muted-foreground"
                        onClick={() => run(() => api.setStatus(i.id, i.status === "open" ? "closed" : "open"))}
                      >
                        {i.status === "open" ? <CheckCircle2Icon /> : <RotateCcwIcon />}
                        {i.status === "open" ? "关闭问题" : "重新打开"}
                      </Button>
                    )}
                    <Button type="submit" size="sm" variant="secondary" className="ml-auto" disabled={busy || !draft.trim()}>
                      回复
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
