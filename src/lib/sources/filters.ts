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
    series: getAll(params, "series"),
    stdTypes: getAll(params, "stype"),
    atlasDisc: getAll(params, "adisc"),
    atlasSrc: getAll(params, "asrc"),
    yearFrom: num("from"),
    yearTo: num("to"),
  }
}

export function filtersToSearch(f: SourceFilters): string {
  const p = new URLSearchParams()
  if (f.q) p.set("q", f.q)
  if (f.kinds.length) p.set("kind", f.kinds.join(","))
  if (f.regions.length) p.set("region", f.regions.join(","))
  if (f.series?.length) p.set("series", f.series.join(","))
  if (f.stdTypes?.length) p.set("stype", f.stdTypes.join(","))
  if (f.atlasDisc?.length) p.set("adisc", f.atlasDisc.join(","))
  if (f.atlasSrc?.length) p.set("asrc", f.atlasSrc.join(","))
  if (f.yearFrom) p.set("from", String(f.yearFrom))
  if (f.yearTo) p.set("to", String(f.yearTo))
  const s = p.toString()
  return s ? `?${s}` : ""
}

/** 年份分档：筛选栏与服务端分面计数共用同一张表 */
export const YEAR_PRESETS: { label: string; from?: number; to?: number }[] = [
  { label: "不限" },
  { label: "2020 年以后", from: 2020 },
  { label: "2010–2019", from: 2010, to: 2019 },
  { label: "2000–2009", from: 2000, to: 2009 },
  { label: "2000 年以前", to: 1999 },
]

/** 本机资料列表的分面计数（与 hold 服务回的形状相同）：每项 =「保留其他条件、只改这一项」时的条数 */
/** 地区两层的分隔符（与 hold 服务 regions.py 相同）。地区规则的正本在 hold；本机只有少量演示/卡片资料 */
export const REGION_SEP = " · "
export const inRegion = (region: string, r: string) => region === r || region.startsWith(r + REGION_SEP)
/** 本机资料（cairn-kb 卡片 / 演示）的地区写法对齐到两层：只处理「全国」这一种，其余照旧（读不出就是「地区未核对」） */
export const localRegion = (r: string) => (r === "全国" ? `中国${REGION_SEP}全国` : r)

export function facetCounts(list: SourceMeta[], f: SourceFilters) {
  const kinds: Partial<Record<SourceKind, number>> = {}
  const countries: Record<string, number> = {}
  const subregions: Record<string, Record<string, number>> = {}
  const series: Record<string, number> = {}
  const stdTypes: Record<string, number> = {}
  const atlasDisc: Record<string, number> = {}
  const atlasSrc: Record<string, number> = {}
  const years = YEAR_PRESETS.map(() => 0)
  for (const s of list) {
    if (matchSource(s, { ...f, kinds: [] })) kinds[s.kind] = (kinds[s.kind] ?? 0) + 1
    if (matchSource(s, { ...f, regions: [] })) {
      const r = localRegion(s.region)
      const c = r.split(REGION_SEP)[0]
      countries[c] = (countries[c] ?? 0) + 1
      if (r.includes(REGION_SEP)) (subregions[c] ??= {})[r] = (subregions[c][r] ?? 0) + 1
    }
    if (s.kind === "magazine" && s.publisher && matchSource(s, { ...f, series: [] })) series[s.publisher] = (series[s.publisher] ?? 0) + 1
    if (s.std_type && matchSource(s, { ...f, stdTypes: [] })) stdTypes[s.std_type] = (stdTypes[s.std_type] ?? 0) + 1
    if (matchSource(s, { ...f, atlasDisc: [] })) for (const x of s.atlas_disc ?? []) atlasDisc[x] = (atlasDisc[x] ?? 0) + 1
    if (matchSource(s, { ...f, atlasSrc: [] })) for (const x of s.atlas_src ?? []) atlasSrc[x] = (atlasSrc[x] ?? 0) + 1
    YEAR_PRESETS.forEach((y, i) => {
      if (matchSource(s, { ...f, yearFrom: y.from, yearTo: y.to })) years[i]++
    })
  }
  return { kinds, countries, subregions, series, stdTypes, atlasDisc, atlasSrc, years }
}

export function matchSource(s: SourceMeta, f: SourceFilters): boolean {
  if (f.kinds.length && !f.kinds.includes(s.kind)) return false
  if (f.regions.length && !f.regions.some((r) => inRegion(localRegion(s.region), r))) return false
  if (f.series?.length && !(s.kind === "magazine" && s.publisher && f.series.includes(s.publisher))) return false
  if (f.stdTypes?.length && !(s.std_type && f.stdTypes.includes(s.std_type))) return false
  if (f.atlasDisc?.length && !(s.atlas_disc ?? []).some((x) => f.atlasDisc!.includes(x))) return false
  if (f.atlasSrc?.length && !(s.atlas_src ?? []).some((x) => f.atlasSrc!.includes(x))) return false
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
  for (const x of f.series ?? [])
    chips.push({
      key: `series-${x}`,
      label: `刊名：${x}`,
      remove: () => ({ ...f, series: (f.series ?? []).filter((y) => y !== x) }),
    })
  const listChips = (key: "stdTypes" | "atlasDisc" | "atlasSrc", name: string) => {
    for (const x of f[key] ?? [])
      chips.push({ key: `${key}-${x}`, label: `${name}：${x}`, remove: () => ({ ...f, [key]: (f[key] ?? []).filter((y) => y !== x) }) })
  }
  listChips("stdTypes", "规范类型")
  listChips("atlasSrc", "图集来源")
  listChips("atlasDisc", "图集专业")
  if (f.yearFrom || f.yearTo)
    chips.push({
      key: "year",
      label: `年份：${f.yearFrom ?? "…"}–${f.yearTo ?? "…"}`,
      remove: () => ({ ...f, yearFrom: undefined, yearTo: undefined }),
    })
  return chips
}
