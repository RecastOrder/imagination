"use client"

import { useState } from "react"
import { CheckCircle2Icon, CircleDashedIcon, InfoIcon, XCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { runChecks, type CheckStatus } from "@/lib/projects/checks"
import type { Project } from "@/lib/projects/types"
import { cn } from "@/lib/utils"

const STATUS: Record<CheckStatus, { label: string; icon: typeof CheckCircle2Icon; cls: string }> = {
  pass: { label: "符合", icon: CheckCircle2Icon, cls: "text-success" },
  fail: { label: "不符合", icon: XCircleIcon, cls: "text-destructive" },
  missing: { label: "待填写", icon: CircleDashedIcon, cls: "text-muted-foreground" },
}

/**
 * 指标核对（机械核对）：本项目的设计指标 vs 规划条件，逐条做数字比较。
 * 明确定位为“辅助”：不理解图纸、不代替审查，结论由本人确认。
 */
export function ChecksTab({
  project,
  canEdit,
  onSave,
}: {
  project: Project
  canEdit: boolean
  onSave: (patch: { metrics: Record<string, number | undefined> }) => Promise<boolean>
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(project.conditions.map((c) => [c.key, project.metrics[c.key]?.toString() ?? ""])),
  )
  const preview = {
    ...project,
    metrics: Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v.trim() === "" ? undefined : Number(v)])),
  }
  const rows = runChecks(preview)
  const dirty = project.conditions.some((c) => (project.metrics[c.key]?.toString() ?? "") !== draft[c.key])
  const counts = { pass: 0, fail: 0, missing: 0 }
  rows.forEach((r) => counts[r.status]++)

  if (project.conditions.length === 0)
    return (
      <div className="rounded-xl border border-dashed px-6 py-14 text-center">
        <p className="font-medium">还没有录入规划条件</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          拿到规划条件通知书后，把容积率、绿地率、限高等限值录进来，这里就能逐条做数字比较（辅助核对，不代替审查）。
        </p>
      </div>
    )

  return (
    <div className="space-y-5">
      <p className="flex gap-2 rounded-lg bg-surface-sunken px-4 py-3 text-sm">
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <span>
          辅助核对：只把你填的设计指标和规划条件做数字比较，<strong>不理解图纸，也不代替审查</strong>。结论请本人确认。
        </span>
      </p>

      <div className="flex flex-wrap gap-4 text-sm">
        {(Object.keys(STATUS) as CheckStatus[]).map((k) => {
          const { label, icon: Icon, cls } = STATUS[k]
          return (
            <span key={k} className={cn("inline-flex items-center gap-1.5", cls)}>
              <Icon className="size-4" />
              {label} {counts[k]}
            </span>
          )
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">指标</th>
              <th className="px-4 py-2.5 font-medium">规划条件</th>
              <th className="px-4 py-2.5 font-medium">本项目</th>
              <th className="px-4 py-2.5 font-medium">结果</th>
              <th className="px-4 py-2.5 font-medium">出处</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ condition: c, status, gap }) => {
              const { label, icon: Icon, cls } = STATUS[status]
              return (
                <tr key={c.key} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium">{c.label}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {c.op === "<=" ? "≤" : c.op === ">=" ? "≥" : "="} {c.value}
                    {c.unit}
                  </td>
                  <td className="px-4 py-2">
                    <span className="flex items-center gap-1">
                      <input
                        value={draft[c.key]}
                        disabled={!canEdit}
                        inputMode="decimal"
                        onChange={(e) => setDraft({ ...draft, [c.key]: e.target.value })}
                        aria-label={`${c.label} 本项目数值`}
                        placeholder="—"
                        className="h-8 w-24 rounded-md border border-input bg-surface px-2 text-right tabular-nums outline-none focus:border-ring disabled:border-transparent disabled:bg-transparent"
                      />
                      <span className="text-muted-foreground">{c.unit}</span>
                    </span>
                  </td>
                  <td className={cn("px-4 py-2.5", cls)}>
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className="size-4" />
                      {label}
                      {gap && <span className="text-xs">（{gap}）</span>}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{c.source}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground">
          日照、光污染、风环境等需要计算的项目，不在这里判断——请用“分析工具”生成报告后，由本人核对。
        </p>
        {canEdit && (
          <Button
            className="ml-auto"
            disabled={!dirty}
            onClick={() => onSave({ metrics: preview.metrics as Record<string, number | undefined> })}
          >
            保存指标
          </Button>
        )}
      </div>
    </div>
  )
}
