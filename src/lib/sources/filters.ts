import type { SourceFilters, SourceKind, SourceMeta } from "./types"
import { SOURCE_KINDS } from "./kinds"

type Params = Record<string, string | string[] | undefined> | URLSearchParams

function getAll(params: Params, key: string): string[] {
  if (params instanceof URLSearchParams) return params.getAll(key).flatMap((v) => v.split(","))
  const v = params[key]
  if (!v) return []
  return (Array.isArray(v) ? v : [v]).flatMap((s) => s.split(",")).filter(Boolean)
}

export function parseFilters(params: Params): SourceFilters {
  const num = (k: string) => {
    const n = Number(getAll(params, k)[0])
    return Number.isFinite(n) && n > 0 ? n : undefined
  }
  return {
    q: getAll(params, "q")[0] || undefined,
    kinds: getAll(params, "kind").filter((k): k is SourceKind => k in SOURCE_KINDS),
    regions: getAll(params, "region"),
    yearFrom: num("from"),
    yearTo: num("to"),
  }
}

export function filtersToSearch(f: SourceFilters): string {
  const p = new URLSearchParams()
  if (f.q) p.set("q", f.q)
  if (f.kinds.length) p.set("kind", f.kinds.join(","))
  if (f.regions.length) p.set("region", f.regions.join(","))
  if (f.yearFrom) p.set("from", String(f.yearFrom))
  if (f.yearTo) p.set("to", String(f.yearTo))
  const s = p.toString()
  return s ? `?${s}` : ""
}

export function matchSource(s: SourceMeta, f: SourceFilters): boolean {
  if (f.kinds.length && !f.kinds.includes(s.kind)) return false
  if (f.regions.length && !f.regions.includes(s.region)) return false
  if (f.yearFrom && s.year < f.yearFrom) return false
  if (f.yearTo && s.year > f.yearTo) return false
  if (f.q) {
    const hay = [s.title, s.code, s.summary, ...(s.authors ?? []), ...s.tags].join(" ").toLowerCase()
    const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!terms.every((t) => hay.includes(t))) return false
  }
  return true
}

/** 把筛选条件转成一个个可以单独删除的标签（对话里 AI 解析出的条件也用它展示） */
export function filterChips(f: SourceFilters): { key: string; label: string; remove: () => SourceFilters }[] {
  const chips: { key: string; label: string; remove: () => SourceFilters }[] = []
  if (f.q) chips.push({ key: "q", label: `关键词：${f.q}`, remove: () => ({ ...f, q: undefined }) })
  for (const k of f.kinds)
    chips.push({
      key: `kind-${k}`,
      label: `类型：${SOURCE_KINDS[k].label}`,
      remove: () => ({ ...f, kinds: f.kinds.filter((x) => x !== k) }),
    })
  for (const r of f.regions)
    chips.push({
      key: `region-${r}`,
      label: `地区：${r}`,
      remove: () => ({ ...f, regions: f.regions.filter((x) => x !== r) }),
    })
  if (f.yearFrom || f.yearTo)
    chips.push({
      key: "year",
      label: `年份：${f.yearFrom ?? "…"}–${f.yearTo ?? "…"}`,
      remove: () => ({ ...f, yearFrom: undefined, yearTo: undefined }),
    })
  return chips
}
