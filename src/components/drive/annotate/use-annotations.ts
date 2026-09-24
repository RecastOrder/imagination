"use client"

import { useCallback, useState } from "react"

import { useLocalStore } from "@/hooks/use-local-store"
import { EMPTY, annotationsStore, type FileAnnotations, type Mark, type NewMark } from "@/lib/drive/annotations"

export type Tool = "browse" | "pin" | "rect" | "measure" | "calibrate"

let seq = 0
const newId = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`

/** 一个文件的标注状态 + 当前工具 + 当前选中的标注 */
export function useAnnotations(fileKey: string) {
  const [all, write] = useLocalStore(annotationsStore)
  const data: FileAnnotations = all[fileKey] ?? EMPTY
  const [tool, setTool] = useState<Tool>("browse")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const save = useCallback(
    (fn: (a: FileAnnotations) => FileAnnotations) => write((s) => ({ ...s, [fileKey]: fn(s[fileKey] ?? EMPTY) })),
    [fileKey, write],
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
