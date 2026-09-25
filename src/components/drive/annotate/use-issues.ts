"use client"

import { useCallback, useEffect, useState } from "react"

import type { Mark } from "@/lib/drive/annotations"
import type { Issue } from "@/lib/drive/issues"
import type { Person } from "./mention-input"

async function call(url: string, method: string, body?: object): Promise<Issue> {
  const r = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data.error ?? "操作失败")
  return data
}

/** 一个文件的问题列表（服务器上，能看这个文件的人共享） */
export function useIssues(fileId: string) {
  const [state, setState] = useState<{ fileId: string; issues: Issue[] } | null>(null)
  // 可以 @ 的人：能看这个文件的同事
  const [people, setPeople] = useState<{ fileId: string; list: Person[] } | null>(null)
  const issues = state?.fileId === fileId ? state.issues : []
  const loaded = state?.fileId === fileId

  useEffect(() => {
    let alive = true
    fetch(`/api/issues?fileId=${encodeURIComponent(fileId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Issue[]) => alive && setState({ fileId, issues: d }))
      .catch(() => alive && setState({ fileId, issues: [] }))
    fetch(`/api/issues?fileId=${encodeURIComponent(fileId)}&mentionable=1`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Person[]) => alive && setPeople({ fileId, list: d }))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [fileId])

  const upsert = useCallback(
    (i: Issue) =>
      setState((s) => {
        const list = s?.fileId === fileId ? s.issues : []
        return { fileId, issues: list.some((x) => x.id === i.id) ? list.map((x) => (x.id === i.id ? i : x)) : [...list, i] }
      }),
    [fileId],
  )

  const raise = useCallback(
    async (input: { mark: Mark; title: string; scale?: number; fileName: string; mentions?: string[] }) => {
      const i = await call("/api/issues", "POST", { fileId, ...input })
      upsert(i)
      return i
    },
    [fileId, upsert],
  )
  const reply = useCallback(
    async (id: string, text: string, mentions?: string[]) => upsert(await call(`/api/issues/${id}`, "POST", { text, mentions })),
    [upsert],
  )
  const setStatus = useCallback(
    async (id: string, status: Issue["status"]) => upsert(await call(`/api/issues/${id}`, "PATCH", { status })),
    [upsert],
  )

  return { issues, loaded, raise, reply, setStatus, people: people?.fileId === fileId ? people.list : [] }
}

export type IssuesApi = ReturnType<typeof useIssues>
