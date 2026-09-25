"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangleIcon, ArrowRightIcon, MapPinIcon, PencilIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SourceStatusTag } from "@/components/source/source-meta"
import { useLocalStore } from "@/hooks/use-local-store"
import { notesStore } from "@/lib/notebook/store"
import { changeFor } from "@/lib/projects/changes"
import type { ProjectRef } from "@/lib/projects/refs"
import { LOCATIONS, matchRequirements, type Level } from "@/lib/projects/regional"
import type { Project, ProjectLocation } from "@/lib/projects/types"
import { isOutdated } from "@/lib/sources/types"
import { getSource } from "@/lib/sources/mock"
import { cn } from "@/lib/utils"

const LEVELS: Level[] = ["国家", "省市", "区"]

/**
 * 概况：位置 → 自动匹配三级要求；规范被替代时列出“改了什么、影响到本项目哪里”。
 */
export function OverviewTab({
  project,
  refs,
  canEdit,
  onSave,
}: {
  project: Project
  refs: ProjectRef[]
  canEdit: boolean
  onSave: (patch: { location: Partial<ProjectLocation> }) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(project.location)
  const loc = editing ? draft : project.location
  const matched = useMemo(() => matchRequirements(loc, project.type), [loc, project.type])
  const [notes] = useLocalStore(notesStore)

  // 被替代的规范 → 变更内容 + 本项目里引用它的地方
  const alerts = matched
    .map((r) => {
      const s = r.sourceId ? getSource(r.sourceId) : undefined
      const change = isOutdated(s) ? changeFor(s!.id) : undefined
      if (!s || !change) return null
      return {
        source: s,
        change,
        refs: refs.filter((x) => x.sourceId === s.id),
        notes: notes.filter((n) => n.sourceId === s.id),
      }
    })
    .filter((x) => !!x)

  const cities = Object.keys(LOCATIONS[draft.province] ?? {})
  const districts = LOCATIONS[draft.province]?.[draft.city] ?? []

  return (
    <div className="space-y-8">
      {/* 规范变更提醒放最上面：这是必须看到的 */}
      {alerts.map(({ source, change, refs: rs, notes: ns }) => (
        <section key={source.id} role="alert" className="rounded-xl border border-warning/50 bg-warning/5 p-5">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangleIcon className="size-4 text-warning" />
            {source.title}（{source.code}）已被替代
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            替代为：{change.replacedBy} · 实施日期：{change.effective}。以下变更可能影响本项目，请自行核对。
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">条文变化</p>
              <ul className="space-y-1.5 text-sm">
                {change.clauses.map((c) => (
                  <li key={c.clause} className="flex gap-2">
                    <Badge variant="outline" className="shrink-0">
                      {c.change}
                    </Badge>
                    <span>
                      <span className="font-medium">{c.clause}</span>：{c.summary}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">本项目中引用它的地方</p>
              <ul className="space-y-1.5 text-sm">
                {rs.map((r) => (
                  <li key={r.id}>
                    <Link href={`/projects/${project.id}?tab=refs`} className="hover:underline">
                      依据清单 · {r.title}
                    </Link>
                  </li>
                ))}
                {ns.length > 0 && (
                  <li>
                    <Link href="/notebook" className="hover:underline">
                      你的笔记本 · {ns.length} 条摘录 / 笔记
                    </Link>
                  </li>
                )}
                {rs.length === 0 && ns.length === 0 && <li className="text-muted-foreground">暂未发现引用</li>}
              </ul>
            </div>
          </div>
        </section>
      ))}

      {/* 位置 */}
      <section>
        <div className="flex items-center gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <MapPinIcon className="size-4 text-muted-foreground" />
            项目位置
          </h2>
          {canEdit && !editing && (
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setEditing(true)}>
              <PencilIcon />
              修改
            </Button>
          )}
        </div>
        {editing ? (
          <form
            className="mt-3 grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-3"
            onSubmit={async (e) => {
              e.preventDefault()
              if (await onSave({ location: draft })) setEditing(false)
            }}
          >
            <Select label="省 / 直辖市" value={draft.province} options={Object.keys(LOCATIONS)} onChange={(v) => {
              const city = Object.keys(LOCATIONS[v])[0]
              setDraft({ ...draft, province: v, city, district: LOCATIONS[v][city][0] })
            }} />
            <Select label="市" value={draft.city} options={cities} onChange={(v) => setDraft({ ...draft, city: v, district: LOCATIONS[draft.province][v][0] })} />
            <Select label="区" value={draft.district} options={districts} onChange={(v) => setDraft({ ...draft, district: v })} />
            <label className="sm:col-span-3">
              <span className="text-xs text-muted-foreground">详细位置</span>
              <Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} className="mt-1" />
            </label>
            <p className="text-xs text-muted-foreground sm:col-span-2">改动位置后，下方“适用要求”会立即重新匹配。</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => (setDraft(project.location), setEditing(false))}>
                取消
              </Button>
              <Button type="submit">保存</Button>
            </div>
          </form>
        ) : (
          <p className="mt-2 text-sm">
            {loc.province === loc.city ? loc.city : `${loc.province} ${loc.city}`} {loc.district}
            <span className="text-muted-foreground"> · {loc.address}</span>
            {loc.lat && <span className="ml-2 text-xs text-muted-foreground tabular-nums">（{loc.lat}°N, {loc.lng}°E）</span>}
          </p>
        )}
      </section>

      {/* 自动匹配的要求 */}
      <section>
        <h2 className="text-base font-semibold">适用要求（按位置和项目类型自动匹配）</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          只列出可能适用的规范和地方规定，是否适用、如何执行，请以原文和主管部门意见为准。
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {LEVELS.map((lv) => {
            const list = matched.filter((r) => r.level === lv)
            return (
              <div key={lv} className="rounded-xl border bg-surface">
                <p className="flex items-center justify-between border-b px-4 py-2.5 text-sm font-medium">
                  {lv === "国家" ? "国家" : lv === "省市" ? loc.city : loc.district}
                  <span className="text-xs font-normal text-muted-foreground">{list.length} 项</span>
                </p>
                <ul className="divide-y">
                  {list.length === 0 && <li className="px-4 py-4 text-sm text-muted-foreground">暂无收录的特殊要求</li>}
                  {list.map((r) => {
                    const s = r.sourceId ? getSource(r.sourceId) : undefined
                    return (
                      <li key={r.id} className={cn("px-4 py-2.5", isOutdated(s) && "bg-warning/5")}>
                        {s ? (
                          <Link href={`/library/${s.id}`} className="group flex items-start gap-1 text-sm font-medium hover:text-primary">
                            <span className="flex-1">{r.title}</span>
                            <ArrowRightIcon className="mt-0.5 size-3.5 opacity-0 group-hover:opacity-100" />
                          </Link>
                        ) : (
                          <p className="text-sm font-medium">{r.title}</p>
                        )}
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          {s?.code && <span>{s.code}</span>}
                          {s?.status && <SourceStatusTag status={s.status} />}
                          <span>{r.summary}</span>
                        </p>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label>
      <span className="text-xs text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9 w-full rounded-md border border-input bg-surface px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  )
}
