"use client"

import { useEffect, useState } from "react"

import type { Source, SourceMeta } from "@/lib/sources/types"

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
