"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { toast } from "@/components/ui/toast"
import { EMPTY, annotationsStore, type FileAnnotations, type Mark, type NewMark } from "@/lib/drive/annotations"

export type Tool = "browse" | "pin" | "rect" | "measure" | "calibrate"

let seq = 0
const newId = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`

const url = (fileId: string) => `/api/annotations?fileId=${encodeURIComponent(fileId)}`

/**
 * 一个文件的个人标注 + 当前工具 + 当前选中的标注。
 * 标注存在服务器上、跟着账号走（已定），但只有自己看得到。
 * 界面先改（不等网络），停手 0.6 秒后一次性保存；失败会提示。
 * 以前存在这台浏览器里的标注，第一次打开时自动搬到服务器上。
 */
export function useAnnotations(fileKey: string) {
  const [state, setState] = useState<{ fileKey: string; data: FileAnnotations } | null>(null)
  const data = state?.fileKey === fileKey ? state.data : EMPTY
  const [tool, setTool] = useState<Tool>("browse")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<{ fileKey: string; data: FileAnnotations } | null>(null)

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const p = pending.current
    pending.current = null
    if (!p) return
    fetch(url(p.fileKey), { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(p.data), keepalive: true })
      .then((r) => {
        if (!r.ok) throw new Error()
      })
      .catch(() => toast("标注没有保存成功，请检查网络后再改一次"))
  }, [])

  // 读取：服务器上的；服务器上没有而本机有旧数据时，搬上去
  useEffect(() => {
    let alive = true
    ;(async () => {
      let server: FileAnnotations = EMPTY
      try {
        const r = await fetch(url(fileKey))
        if (r.ok) server = await r.json()
      } catch {}
      const local = annotationsStore.read()[fileKey]
      if (server.marks.length === 0 && Object.keys(server.scales).length === 0 && local && (local.marks.length || Object.keys(local.scales).length)) {
        server = local
        pending.current = { fileKey, data: local }
        flush()
        annotationsStore.write((all) => {
          const rest = { ...all }
          delete rest[fileKey]
          return rest
        })
      }
      if (alive) setState({ fileKey, data: server })
    })()
    return () => {
      alive = false
    }
  }, [fileKey, flush])

  // 离开这个文件时把没保存的立刻保存
  useEffect(() => () => flush(), [fileKey, flush])

  const save = useCallback(
    (fn: (a: FileAnnotations) => FileAnnotations) =>
      setState((s) => {
        const next = fn(s?.fileKey === fileKey ? s.data : EMPTY)
        pending.current = { fileKey, data: next }
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(flush, 600)
        return { fileKey, data: next }
      }),
    [fileKey, flush],
  )

  const add = useCallback(
    (m: NewMark) => {
      const mark = { ...m, id: newId() } as Mark
      save((a) => ({ ...a, marks: [...a.marks, mark] }))
      setSelectedId(mark.id)
      return mark
    },
    [save],
  )
  const update = useCallback(
    (id: string, patch: Partial<Mark>) =>
      save((a) => ({ ...a, marks: a.marks.map((m) => (m.id === id ? ({ ...m, ...patch } as Mark) : m)) })),
    [save],
  )
  const remove = useCallback(
    (id: string) => {
      save((a) => ({ ...a, marks: a.marks.filter((m) => m.id !== id) }))
      setSelectedId((s) => (s === id ? null : s))
    },
    [save],
  )
  const setScale = useCallback(
    (page: number | "all", mmPerUnit: number) =>
      save((a) => ({ ...a, scales: page === "all" ? { all: mmPerUnit } : { ...a.scales, [String(page)]: mmPerUnit } })),
    [save],
  )

  return { data, tool, setTool, selectedId, setSelectedId, add, update, remove, setScale }
}

export type AnnotationsApi = ReturnType<typeof useAnnotations>
