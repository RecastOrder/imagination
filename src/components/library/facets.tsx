"use client"

import { CheckIcon } from "lucide-react"

import { matchSource } from "@/lib/sources/filters"
import { SOURCE_KIND_ORDER, SOURCE_KINDS } from "@/lib/sources/kinds"
import { REGIONS, SOURCES } from "@/lib/sources/mock"
import type { SourceFilters } from "@/lib/sources/types"
import { cn } from "@/lib/utils"

const YEAR_PRESETS: { label: string; from?: number; to?: number }[] = [
  { label: "不限" },
  { label: "2020 年以后", from: 2020 },
  { label: "2010–2019", from: 2010, to: 2019 },
  { label: "2000–2009", from: 2000, to: 2009 },
  { label: "2000 年以前", to: 1999 },
]

/**
 * 分面筛选（Faceted search）。每个选项后面的数字 =
 * “保留其他条件、只改这一项时会有多少结果”，让用户点之前就知道会不会“筛没了”。
 */
export function Facets({ filters, onChange }: { filters: SourceFilters; onChange: (f: SourceFilters) => void }) {
  const count = (patch: Partial<SourceFilters>) =>
    SOURCES.filter((s) => matchSource(s, { ...filters, ...patch })).length

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
              count={count({ kinds: [k] })}
              onClick={() => onChange({ ...filters, kinds: toggle(filters.kinds, k) })}
            >
              <Icon className="size-3.5 text-muted-foreground" />
              {label}
            </FacetOption>
          )
        })}
      </FacetGroup>

      <FacetGroup title="地区">
        {REGIONS.map((r) => (
          <FacetOption
            key={r}
            checked={filters.regions.includes(r)}
            count={count({ regions: [r] })}
            onClick={() => onChange({ ...filters, regions: toggle(filters.regions, r) })}
          >
            {r}
          </FacetOption>
        ))}
      </FacetGroup>

      <FacetGroup title="年份">
        {YEAR_PRESETS.map((p) => {
          const checked = filters.yearFrom === p.from && filters.yearTo === p.to
          return (
            <FacetOption
              key={p.label}
              radio
              checked={checked}
              count={count({ yearFrom: p.from, yearTo: p.to })}
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
    <fieldset>
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
}: {
  checked: boolean
  count: number
  radio?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  const disabled = count === 0 && !checked
  return (
    <button
      type="button"
      role={radio ? "radio" : "checkbox"}
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
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
      <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left">{children}</span>
      <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
    </button>
  )
}
