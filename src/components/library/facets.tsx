"use client"

import { useState } from "react"
import { CheckIcon, ChevronRightIcon } from "lucide-react"

import { REGION_SEP, YEAR_PRESETS } from "@/lib/sources/filters"
import { SOURCE_KIND_ORDER, SOURCE_KINDS } from "@/lib/sources/kinds"
import type { SourceFilters } from "@/lib/sources/types"
import type { SourceSearch } from "@/hooks/use-sources"
import { cn } from "@/lib/utils"

/**
 * 分面筛选（Faceted search）。每个选项后面的数字 =
 * “保留其他条件、只改这一项时会有多少结果”，让用户点之前就知道会不会“筛没了”。
 */

const SERIES_SHOWN = 30

export function Facets({
  counts,
  filters,
  onChange,
}: {
  /** 服务端算好的分面计数（/api/sources/search）；还没回来时为空，数字显示 0 但不禁用已选项 */
  counts?: SourceSearch["facets"]
  filters: SourceFilters
  onChange: (f: SourceFilters) => void
}) {
  // 地区两层（owner 2026-09-26「地区里面要有 国家的区分，然后才是地区的区分」）：先列国家，
  // 点国家旁的箭头展开它下面的地区。已选的即使当前是 0 也留着（否则取消不了）。
  const countries = Object.entries(counts?.countries ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c)
  for (const r of filters.regions) {
    const c = r.split(REGION_SEP)[0]
    if (!countries.includes(c)) countries.push(c)
  }
  // 展开：手动点开的 ∪ 选了下级地区的（任何时候选上都自动展开）；手动收起的尊重用户
  const [open, setOpen] = useState<string[]>([])
  const [shut, setShut] = useState<string[]>([])
  // 刊名多（上百个）：先显示按期数排前的 SERIES_SHOWN 个，已选的总在；其余点开看全部 —— 不许悄悄截掉
  const [allSeries, setAllSeries] = useState(false)
  const series = Object.entries(counts?.series ?? {}).sort((a, b) => b[1] - a[1])
  for (const x of filters.series ?? []) if (!series.some(([n]) => n === x)) series.push([x, 0])

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  return (
    <div className="space-y-6">
      <FacetGroup title="资料类型">
        {SOURCE_KIND_ORDER.map((k) => {
          const { label, icon: Icon } = SOURCE_KINDS[k]
          return (
            <FacetOption
              key={k}
              checked={filters.kinds.includes(k)}
              count={counts?.kinds[k] ?? 0}
              onClick={() => onChange({ ...filters, kinds: toggle(filters.kinds, k) })}
            >
              <Icon className="size-3.5 text-muted-foreground" />
              {label}
            </FacetOption>
          )
        })}
      </FacetGroup>

      <FacetGroup title="地区">
        {countries.map((c) => {
          const subs = Object.entries(counts?.subregions?.[c] ?? {}).sort((a, b) => b[1] - a[1])
          for (const r of filters.regions) if (r.startsWith(c + REGION_SEP) && !subs.some(([x]) => x === r)) subs.push([r, 0])
          const expanded = open.includes(c) || (filters.regions.some((r) => r.startsWith(c + REGION_SEP)) && !shut.includes(c))
          return (
            <div key={c}>
              <div className="flex min-w-0 items-center">
                {subs.length > 0 ? (
                  <button
                    type="button"
                    aria-label={expanded ? `收起${c}的地区` : `展开${c}的地区`}
                    aria-expanded={expanded}
                    onClick={() => {
                      setOpen((o) => (expanded ? o.filter((x) => x !== c) : [...o, c]))
                      setShut((o) => (expanded ? [...o, c] : o.filter((x) => x !== c)))
                    }}
                    className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-accent"
                  >
                    <ChevronRightIcon className={cn("size-3.5 transition-transform", expanded && "rotate-90")} />
                  </button>
                ) : (
                  <span className="size-6 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <FacetOption
                    checked={filters.regions.includes(c)}
                    count={counts?.countries?.[c] ?? 0}
                    onClick={() => onChange({ ...filters, regions: toggle(filters.regions.filter((r) => !r.startsWith(c + REGION_SEP)), c) })}
                    title={c}
                  >
                    {c}
                  </FacetOption>
                </div>
              </div>
              {expanded && (
                <div className="ml-6 border-l pl-1">
                  {subs.map(([r, n]) => {
                    const name = r.slice(c.length + REGION_SEP.length)
                    return (
                      <FacetOption
                        key={r}
                        checked={filters.regions.includes(r)}
                        count={n}
                        onClick={() => onChange({ ...filters, regions: toggle(filters.regions.filter((x) => x !== c), r) })}
                        title={r}
                      >
                        {name}
                      </FacetOption>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </FacetGroup>

      {series.length > 0 && (
        <FacetGroup title="刊名">
          {(allSeries ? series : series.filter(([x], i) => i < SERIES_SHOWN || (filters.series ?? []).includes(x))).map(([x, n]) => (
            <FacetOption
              key={x}
              checked={(filters.series ?? []).includes(x)}
              count={n}
              onClick={() => onChange({ ...filters, series: toggle(filters.series ?? [], x) })}
              title={x}
            >
              {x}
            </FacetOption>
          ))}
          {series.length > SERIES_SHOWN && (
            <button
              type="button"
              onClick={() => setAllSeries((v) => !v)}
              className="mt-1 cursor-pointer px-2 py-1 text-left text-xs text-muted-foreground hover:text-foreground"
            >
              {allSeries ? "收起" : `显示全部 ${series.length} 个刊`}
            </button>
          )}
        </FacetGroup>
      )}

      <FacetGroup title="年份">
        {YEAR_PRESETS.map((p, i) => {
          const checked = filters.yearFrom === p.from && filters.yearTo === p.to
          return (
            <FacetOption
              key={p.label}
              radio
              checked={checked}
              count={counts?.years[i] ?? 0}
              onClick={() => onChange({ ...filters, yearFrom: p.from, yearTo: p.to })}
            >
              {p.label}
            </FacetOption>
          )
        })}
      </FacetGroup>
    </div>
  )
}

function FacetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    // min-w-0：fieldset 默认最小宽度 = 最长那一项，长地名会把整组撑出侧栏、数字被资料列表压住（2026-09-26 实测）
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-xs font-medium text-muted-foreground">{title}</legend>
      <div className="space-y-0.5">{children}</div>
    </fieldset>
  )
}

function FacetOption({
  checked,
  count,
  radio,
  onClick,
  children,
  title,
}: {
  checked: boolean
  count: number
  radio?: boolean
  onClick: () => void
  children: React.ReactNode
  /** 名字太长被截断时，鼠标停上去看全名 */
  title?: string
}) {
  const disabled = count === 0 && !checked
  return (
    <button
      type="button"
      role={radio ? "radio" : "checkbox"}
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      title={title}
      className="flex h-8 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center border border-input bg-surface transition-colors",
          radio ? "rounded-full" : "rounded-[4px]",
          checked && "border-primary bg-primary text-primary-foreground",
        )}
      >
        {checked && (radio ? <span className="size-1.5 rounded-full bg-current" /> : <CheckIcon className="size-3" strokeWidth={3} />)}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-left"><span className="truncate">{children}</span></span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{count}</span>
    </button>
  )
}
