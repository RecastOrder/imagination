import { cache } from "react"

import type { Source, SourceFilters, SourceKind, SourceMeta } from "@/lib/sources/types"
import { YEAR_PRESETS } from "@/lib/sources/filters"

/**
 * hold 资料服务（holdlib）：规范 · 图集 · 媒体 的正本都在 hold 上，目录由 hold 从台账现算（owner 2026-09-26
 * 「把规范接入规范， 图集接入图集，媒体接入媒体。 后续最好是对应接口自动接入」）。
 *
 * 为什么不像 cairn-kb 那样把目录装进本进程：hold 那边有二十多万条，而本服务限额 700 MB、实测已用 570 MB。
 * 所以搜索在 hold 上跑，这里只转发；本机只经 tailnet 直连 hold（HOLD_LIB_URL），带令牌 HOLD_LIB_TOKEN。
 * 没配置 ⇒ 这一路整体关闭，资料库照旧只显示本机资料。
 */
const ID = /^h[samz]-[0-9a-f]{16}$/

export const isHoldId = (id: string) => ID.test(id)

export function holdEnabled() {
  return Boolean(process.env.HOLD_LIB_URL && process.env.HOLD_LIB_TOKEN)
}

async function call(path: string, timeoutMs = 8000, extra: Record<string, string> = {}): Promise<Response> {
  if (!holdEnabled()) throw new Error("hold 资料服务没有配置")
  return fetch(`${process.env.HOLD_LIB_URL}${path}`, {
    headers: { authorization: `Bearer ${process.env.HOLD_LIB_TOKEN}`, ...extra },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  })
}

export interface FacetCounts {
  kinds: Partial<Record<SourceKind, number>>
  /** 地区第一层：国家 → 条数 */
  countries: Record<string, number>
  /** 地区第二层：国家 → { 「国家 · 地区」 → 条数 } */
  subregions: Record<string, Record<string, number>>
  /** 杂志的刊名 → 期数 */
  series: Record<string, number>
  /** 规范类型 · 图集专业与专题 · 图集来源 → 条数（spec 107） */
  stdTypes: Record<string, number>
  atlasDisc: Record<string, number>
  atlasSrc: Record<string, number>
  /** 与 YEAR_PRESETS 一一对应 */
  years: number[]
}

export interface SearchResult {
  total: number
  items: SourceMeta[]
  facets: FacetCounts
}

export type HoldSearch = SearchResult | { error: string; status: number }

export async function holdSearch(f: SourceFilters, limit: number): Promise<HoldSearch> {
  const p = new URLSearchParams()
  if (f.q) p.set("q", f.q)
  if (f.kinds.length) p.set("kinds", f.kinds.join(","))
  if (f.regions.length) p.set("regions", f.regions.join(","))
  if (f.series?.length) p.set("series", f.series.join(","))
  if (f.stdTypes?.length) p.set("stype", f.stdTypes.join(","))
  if (f.atlasDisc?.length) p.set("adisc", f.atlasDisc.join(","))
  if (f.atlasSrc?.length) p.set("asrc", f.atlasSrc.join(","))
  if (f.yearFrom) p.set("from", String(f.yearFrom))
  if (f.yearTo) p.set("to", String(f.yearTo))
  p.set("limit", String(limit))
  p.set("ypre", YEAR_PRESETS.map((y) => `${y.from ?? ""}-${y.to ?? ""}`).join(","))
  try {
    const r = await call(`/v1/search?${p}`)
    if (!r.ok) return { error: r.status === 503 ? "hold 资料目录还在建" : `hold 资料服务返回 ${r.status}`, status: r.status }
    return (await r.json()) as SearchResult
  } catch {
    return { error: "hold 资料服务连不上", status: 502 }
  }
}

/** 同一次请求里（阅读页的标题 + 正文）只向 hold 取一次 */
export const holdGet = cache(holdGetUncached)

async function holdGetUncached(id: string): Promise<Source | undefined> {
  if (!isHoldId(id) || !holdEnabled()) return undefined
  try {
    // 打开次数（资料库按它排序）：只有线上服务配了 HOLD_COUNT_OPENS=1 才让 hold 记一次 ——
    // 本机测试、探针不配，就不会把我们自己的实测算成「有人打开」（发起方自报）。holdGet 有同请求去重，一次打开只记一次
    const r = await call(`/v1/source/${id}`, 15000, process.env.HOLD_COUNT_OPENS === "1" ? { "x-count-open": "1" } : {})
    return r.ok ? ((await r.json()) as Source) : undefined
  } catch {
    return undefined
  }
}

/**
 * 原件（规范/图集的 PDF）与媒体图片：从 hold 流式转过来，不在本机落盘。
 * kind = "file" ⇒ /v1/file/<id>；kind = "asset" ⇒ /v1/asset/<id>/<n>
 */
export async function holdStream(path: string): Promise<Response> {
  if (!holdEnabled()) return new Response("hold 资料服务没有配置", { status: 503 })
  // 只限制「等 hold 开始回话」这一段；开始传以后不再计时 —— 七八十 MB 的规范原件传一分钟以上是正常的
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 30000)
  try {
    const r = await fetch(`${process.env.HOLD_LIB_URL}${path}`, {
      headers: { authorization: `Bearer ${process.env.HOLD_LIB_TOKEN}` },
      cache: "no-store",
      signal: ctl.signal,
    })
    clearTimeout(timer)
    if (!r.ok || !r.body) return new Response(r.status === 404 ? "没有取回" : `hold 返回 ${r.status}`, { status: r.status === 404 ? 404 : 502 })
    return new Response(r.body, {
      headers: {
        "content-type": r.headers.get("content-type") ?? "application/octet-stream",
        ...(r.headers.get("content-length") ? { "content-length": r.headers.get("content-length")! } : {}),
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    })
  } catch {
    clearTimeout(timer)
    return new Response("hold 资料服务连不上", { status: 502 })
  }
}

/** 管理员「我的文件」= hold 上的文件：列一个文件夹（hold 端只允许 /tank 以内） */
export interface HoldFsEntry {
  name: string
  dir: boolean
  size: number | null
  mtime: number
}
/** editable：这个文件夹里能改（inbox / baidu，owner 2026-09-26）；trash：在回收站里（只能放回）；editRoot：属于哪个可编辑区 */
export interface HoldFsListing {
  path: string
  total: number
  entries: HoldFsEntry[]
  editable?: boolean
  trash?: boolean
  editRoot?: string | null
}
export async function holdFsList(path: string, offset = 0, scope?: string): Promise<HoldFsListing | { error: string; status: number }> {
  if (!holdEnabled()) return { error: "hold 资料服务没有配置", status: 503 }
  try {
    const r = await call(`/v1/fs/list?${new URLSearchParams({ path, offset: String(offset) })}`, 20000, scope ? { "x-edit-scope": scope } : {})
    if (!r.ok) return { error: r.status === 404 ? "不是 hold /tank 以内的文件夹" : `hold 返回 ${r.status}`, status: r.status === 404 ? 404 : 502 }
    return await r.json()
  } catch {
    return { error: "hold 资料服务连不上", status: 502 }
  }
}

/**
 * 改 hold 上的可编辑区（只有 /tank/inbox 与 /tank/baidu；其余一律只读 —— owner 2026-09-26 逐字
 * 「整理好的资料，系统与备份，成员文件 对于管理员为只读。 inbox baidu为可以编辑的文件区域。」）。
 * 哪里能改由 hold 那一端按真实路径判（这一侧不另判一份，免得两处规则不一致）；actor = 谁改的，hold 记进账本。
 * 原样把 hold 的状态码和中文错误带回来。
 */
export async function holdFsEdit(op: string, body: Record<string, unknown>, actor: string, scope: string): Promise<{ status: number; body: unknown }> {
  if (!holdEnabled()) return { status: 503, body: { error: "hold 资料服务没有配置" } }
  try {
    const r = await fetch(`${process.env.HOLD_LIB_URL}/v1/fs/edit/${encodeURIComponent(op)}`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.HOLD_LIB_TOKEN}`, "content-type": "application/json", "x-actor": actor, "x-edit-scope": scope },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
    })
    return { status: r.status, body: await r.json().catch(() => ({ error: `hold 返回 ${r.status}` })) }
  } catch {
    return { status: 502, body: { error: "hold 资料服务连不上" } }
  }
}

/** 分块上传的一块（请求体原样流给 hold，不在这台机器上缓冲整块以外的东西） */
export async function holdFsUploadChunk(
  q: { dir: string; name: string; uid: string; offset: number; total: number },
  body: ReadableStream<Uint8Array>,
  length: number,
  actor: string,
  scope: string,
): Promise<{ status: number; body: unknown }> {
  if (!holdEnabled()) return { status: 503, body: { error: "hold 资料服务没有配置" } }
  try {
    const qs = new URLSearchParams({ dir: q.dir, name: q.name, uid: q.uid, offset: String(q.offset), total: String(q.total) })
    const r = await fetch(`${process.env.HOLD_LIB_URL}/v1/fs/upload?${qs}`, {
      method: "PUT",
      headers: { authorization: `Bearer ${process.env.HOLD_LIB_TOKEN}`, "content-length": String(length), "x-actor": actor, "x-edit-scope": scope },
      body,
      // @ts-expect-error Node 的 fetch 流式上传要声明 duplex（DOM 类型里没有这个字段）
      duplex: "half",
      cache: "no-store",
      signal: AbortSignal.timeout(300000),
    })
    return { status: r.status, body: await r.json().catch(() => ({ error: `hold 返回 ${r.status}` })) }
  } catch {
    return { status: 502, body: { error: "hold 资料服务连不上（这一块可以重传）" } }
  }
}

export async function holdFsUploadStatus(dir: string, uid: string, scope: string): Promise<{ status: number; body: unknown }> {
  if (!holdEnabled()) return { status: 503, body: { error: "hold 资料服务没有配置" } }
  try {
    const r = await call(`/v1/fs/upload-status?${new URLSearchParams({ dir, uid })}`, 15000, { "x-edit-scope": scope })
    return { status: r.status, body: await r.json().catch(() => ({})) }
  } catch {
    return { status: 502, body: { error: "hold 资料服务连不上" } }
  }
}
