import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/server/current-user"
import { holdEnabled, holdSearch, type FacetCounts } from "@/lib/server/hold-library"
import { sourcesRepo } from "@/lib/server/sources-repo"
import { facetCounts, matchSource, parseFilters } from "@/lib/sources/filters"

/** 资料库检索：一次最多回这么多条（页面「只显示前 N 份」） */
const SHOWN = 100

/**
 * 资料库检索（服务端）：本机资料（cairn-kb 资料卡）＋ hold 资料服务（规范 · 图集 · 媒体）。
 * 查询参数与资料库页面的网址参数相同（q · kind · region · from · to）。
 * 回：总数 · 前 SHOWN 条 · 分面计数；hold 那一路出错时如实带回 holdError，不假装它是空的。
 */
export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const f = parseFilters(new URL(req.url).searchParams)

  const local = sourcesRepo().list()
  const localHits = local.filter((s) => matchSource(s, f))
  const facets: FacetCounts = facetCounts(local, f)
  let total = localHits.length
  const items = localHits.slice(0, SHOWN)
  let holdError: string | undefined

  if (holdEnabled()) {
    const h = await holdSearch(f, SHOWN)
    if ("error" in h) holdError = h.error
    else {
      total += h.total
      items.push(...h.items.slice(0, Math.max(0, SHOWN - items.length)))
      for (const [k, n] of Object.entries(h.facets.kinds)) facets.kinds[k as keyof FacetCounts["kinds"]] = (facets.kinds[k as keyof FacetCounts["kinds"]] ?? 0) + (n ?? 0)
      for (const [c, n] of Object.entries(h.facets.countries)) facets.countries[c] = (facets.countries[c] ?? 0) + n
      for (const [c, subs] of Object.entries(h.facets.subregions))
        for (const [r, n] of Object.entries(subs)) (facets.subregions[c] ??= {})[r] = (facets.subregions[c][r] ?? 0) + n
      for (const [x, n] of Object.entries(h.facets.series)) facets.series[x] = (facets.series[x] ?? 0) + n
      for (const key of ["stdTypes", "atlasDisc", "atlasSrc"] as const)
        for (const [x, n] of Object.entries(h.facets[key] ?? {})) facets[key][x] = (facets[key][x] ?? 0) + n
      h.facets.years.forEach((n, i) => (facets.years[i] = (facets.years[i] ?? 0) + n))
    }
  }
  return NextResponse.json({ total, items, facets, holdError }, { headers: { "Cache-Control": "private, max-age=60" } })
}
