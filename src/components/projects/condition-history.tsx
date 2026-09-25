"use client"

import { HistoryIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { diffConditions, fmtCondition, type ConditionRound } from "@/lib/projects/condition-rounds"
import { cn } from "@/lib/utils"

const when = (t: number) => (t ? new Date(t).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" }) : "—")

/**
 * 规划条件的历史轮次（像 Git 的提交记录 / Word 的修订记录）：
 * 最新的在上面；每一轮列出和上一轮相比“新增 / 删除 / 改了什么”，可以展开看这一轮的完整条件。
 */
export function ConditionHistory({ open, onOpenChange, rounds }: { open: boolean; onOpenChange: (o: boolean) => void; rounds: ConditionRound[] }) {
  const list = [...rounds].reverse()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[min(96vw,40rem)] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2">
          <HistoryIcon className="size-4 text-muted-foreground" />
          规划条件的历史
        </DialogTitle>
        <DialogDescription>每次确认保存算一轮，所有轮次永久保留。</DialogDescription>
        <ol className="mt-4 space-y-3">
          {list.map((r, i) => {
            const prev = list[i + 1]
            const changes = prev ? diffConditions(prev.conditions, r.conditions) : []
            return (
              <li key={r.id} className={cn("rounded-lg border p-3", i === 0 && "border-border-strong")}>
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">第 {r.round} 轮</span>
                  {i === 0 && <Badge variant="outline">当前</Badge>}
                  <span className="text-muted-foreground">
                    {r.savedByName}
                    {r.savedAt ? ` · ${when(r.savedAt)}` : ""}
                  </span>
                </p>
                {r.note && <p className="mt-1 text-sm">依据：{r.note}</p>}
                {prev ? (
                  changes.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">和第 {prev.round} 轮相比没有变化（重新确认）</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm">
                      {changes.map((c) => (
                        <li key={c.kind + c.label} className="flex flex-wrap items-center gap-2">
                          <Badge variant={c.kind === "changed" ? "primary" : "outline"}>{c.kind === "added" ? "新增" : c.kind === "removed" ? "删除" : "修改"}</Badge>
                          <span className="font-medium">{c.label}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {c.kind === "added" && fmtCondition(c.after)}
                            {c.kind === "removed" && <s>{fmtCondition(c.before)}</s>}
                            {c.kind === "changed" && (
                              <>
                                <s>{fmtCondition(c.before)}</s> → <span className="text-foreground">{fmtCondition(c.after)}</span>
                              </>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">第一轮：{r.conditions.length} 条条件</p>
                )}
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground">这一轮的全部条件</summary>
                  <ul className="mt-1 grid gap-x-4 text-sm sm:grid-cols-2">
                    {r.conditions.map((c) => (
                      <li key={c.key} className="flex justify-between gap-2 py-0.5">
                        <span>{c.label}</span>
                        <span className="tabular-nums text-muted-foreground">{fmtCondition(c)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            )
          })}
        </ol>
      </DialogContent>
    </Dialog>
  )
}
