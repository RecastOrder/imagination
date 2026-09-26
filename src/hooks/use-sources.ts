"use client"

import { useEffect, useState } from "react"

import { filtersToSearch } from "@/lib/sources/filters"
import type { Source, SourceFilters, SourceKind, SourceMeta } from "@/lib/sources/types"

/**
 * 资料的前端读取口：资料列表（/api/sources）与单份全文（/api/sources/[id]）。
 * 数据从哪来（演示 / Cairn 知识库）由服务端 src/lib/server/sources-repo.ts 决定，前端不关心。
 * 列表整页只取一次，缓存在模块里；筛选、分面计数都在这份列表上做。
 */
let listPromise: Promise<SourceMeta[]> | undefined

function fetchList() {
  listPromise ??= fetch("/api/sources").then((r) => {
    if (!r.ok) throw new Error(`资料列表加载失败（${r.status}）`)
    return r.json() as Promise<SourceMeta[]>
  })
  listPromise.catch(() => (listPromise = undefined))
  return listPromise
}

export function useSourceList(): { sources: SourceMeta[]; regions: string[]; loading: boolean; error?: string } {
  const [state, setState] = useState<{ sources: SourceMeta[]; loading: boolean; error?: string }>({
    sources: [],
    loading: true,
  })
  useEffect(() => {
    let alive = true
    fetchList().then(
      (sources) => alive && setState({ sources, loading: false }),
      (e: Error) => alive && setState({ sources: [], loading: false, error: e.message }),
    )
    return () => {
      alive = false
    }
  }, [])
  const regions = Array.from(new Set(state.sources.map((s) => s.region)))
  return { ...state, regions }
}

export interface SourceSearch {
  total: number
  items: SourceMeta[]
  facets: { kinds: Partial<Record<SourceKind, number>>; regions: Record<string, number>; years: number[] }
  /** hold 资料服务那一路出了错（本机资料照常显示）：如实提示，不当成「没有」 */
  holdError?: string
}

/**
 * 资料库检索：条件交给服务端（/api/sources/search），只取回前 100 条和分面计数。
 * hold 上的规范 · 图集 · 媒体有二十多万条，不能再整张拉到浏览器里筛。
 */
export function useSourceSearch(filters: SourceFilters): { data?: SourceSearch; loading: boolean; error?: string } {
  const key = filtersToSearch(filters)
  const [state, setState] = useState<{ key: string; data?: SourceSearch; error?: string }>()
  useEffect(() => {
    let alive = true
    fetch(`/api/sources/search${key}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`资料检索失败（${r.status}）`)
        return (await r.json()) as SourceSearch
      })
      .then(
        (data) => alive && setState({ key, data }),
        (e: Error) => alive && setState({ key, error: e.message }),
      )
    return () => {
      alive = false
    }
  }, [key])
  const current = state?.key === key ? state : undefined
  return { data: current?.data ?? state?.data, loading: !current, error: current?.error }
}

/** 按 id 取资料元信息（标题、编号等），用已缓存的列表，不取正文 —— 引用标签、资料卡片用 */
export function useSourceMeta(id: string): SourceMeta | undefined {
  const { sources } = useSourceList()
  return sources.find((s) => s.id === id)
}

const fullCache = new Map<string, Source>()

export function useSource(id: string): { source?: Source; loading: boolean; missing: boolean } {
  // 取过的直接从缓存读（渲染时读，不在 effect 里 setState）；没取过的才发请求
  const cached = fullCache.get(id)
  const [fetched, setFetched] = useState<{ id: string; source?: Source }>()
  useEffect(() => {
    if (fullCache.has(id)) return
    let alive = true
    fetch(`/api/sources/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? (r.json() as Promise<Source>) : undefined))
      .catch(() => undefined)
      .then((s) => {
        if (s) fullCache.set(id, s)
        if (alive) setFetched({ id, source: s })
      })
    return () => {
      alive = false
    }
  }, [id])
  if (cached) return { source: cached, loading: false, missing: false }
  const done = fetched?.id === id
  return { source: done ? fetched.source : undefined, loading: !done, missing: done && !fetched.source }
}
