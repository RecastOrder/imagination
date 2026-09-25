"use client"

import { useState } from "react"
import { BookmarkPlusIcon, MapPinIcon, MessageSquareShareIcon, RulerIcon, SquareDashedIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SaveToNotebook } from "@/components/notebook/save-to-notebook"
import { distance, formatLength, paperRatio, scaleFor, type Mark } from "@/lib/drive/annotations"
import { cn } from "@/lib/utils"
import type { AnnotationsApi } from "./use-annotations"

const KIND = {
  pin: { label: "标记", icon: MapPinIcon },
  rect: { label: "框选", icon: SquareDashedIcon },
  measure: { label: "测量", icon: RulerIcon },
} as const

/**
 * “我的标注”：只有自己看得到。按页排列；选中的可以写批注、删除、存入笔记本，
 * 或者“发起问题”——把这条标注交给能看这个文件的人一起看、一起讨论（发起后从“我的标注”移到“问题”）。
 */
export function MarksPanel({
  api,
  fileId,
  fileName,
  unit,
  onJump,
  onRaise,
}: {
  api: AnnotationsApi
  fileId: string
  fileName: string
  unit: "pt" | "px"
  onJump: (m: Mark) => void
  /** 发起问题；没有编辑权限时不传 */
  onRaise?: (m: Mark, title: string) => Promise<boolean>
}) {
  const [raising, setRaising] = useState<{ id: string; title: string } | null>(null)
  const { data, selectedId, setSelectedId, update, remove } = api
  const marks = [...data.marks].sort((a, b) => a.page - b.page)
  const globalScale = data.scales.all
  const describe = (m: Mark) => {
    if (m.kind !== "measure") return m.text
    const len = formatLength(distance(m.x1, m.y1, m.x2, m.y2), scaleFor(data, m.page))
    return m.text ? `${len} · ${m.text}` : len
  }

  return (
    <>
      <div className="border-b px-4 py-2.5 text-xs text-muted-foreground">
        {globalScale || Object.keys(data.scales).length ? (
          <span>
            比例已校准
            {globalScale && paperRatio(globalScale, unit) ? `（${paperRatio(globalScale, unit)}）` : ""}
          </span>
        ) : (
          <span>未校准比例：用“校准”工具沿一段已知尺寸画线，测量结果才会换算成毫米。</span>
        )}
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto p-2">
        {marks.length === 0 && (
          <li className="px-2 py-8 text-center text-sm text-muted-foreground">
            还没有标注。选择上方的“标记”“框选”或“测量”开始。
            <br />
            这里的标注只有你自己看得到。
          </li>
        )}
        {marks.map((m) => {
          const { label, icon: Icon } = KIND[m.kind]
          const sel = m.id === selectedId
          return (
            <li key={m.id} className={cn("rounded-lg border border-transparent p-2", sel && "border-border bg-surface-sunken")}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(m.id)
                  onJump(m)
                }}
                className="flex w-full cursor-pointer items-center gap-2 text-left text-sm"
              >
                <Icon className="size-3.5 shrink-0 text-markup" />
                <span className="text-xs text-muted-foreground">
                  第 {m.page} 页 · {label}
                </span>
                <span className="min-w-0 flex-1 truncate">{describe(m) || <span className="text-muted-foreground">未填写</span>}</span>
              </button>
              {sel && (
                <div className="mt-2 space-y-2">
                  <textarea
                    autoFocus={m.kind !== "measure"}
                    rows={2}
                    value={m.text}
                    onChange={(e) => update(m.id, { text: e.target.value })}
                    placeholder={m.kind === "measure" ? "备注（可选）" : "写下批注…"}
                    className="block w-full resize-none rounded-md border border-input bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-ring"
                  />
                  {raising?.id === m.id ? (
                    <form
                      className="space-y-1.5 rounded-md border bg-surface p-2"
                      onSubmit={async (e) => {
                        e.preventDefault()
                        if (raising.title.trim() && onRaise && (await onRaise(m, raising.title.trim()))) setRaising(null)
                      }}
                    >
                      <p className="text-xs text-muted-foreground">发起后，能看这个文件的人都能看到并回复。</p>
                      <input
                        autoFocus
                        value={raising.title}
                        onChange={(e) => setRaising({ id: m.id, title: e.target.value })}
                        placeholder="一句话说明问题"
                        aria-label="问题说明"
                        className="h-8 w-full rounded-md border border-input bg-surface px-2 text-sm outline-none focus:border-ring"
                      />
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setRaising(null)}>
                          取消
                        </Button>
                        <Button type="submit" size="sm" disabled={!raising.title.trim()}>
                          发起问题
                        </Button>
                      </div>
                    </form>
                  ) : (
                  <div className="flex flex-wrap gap-1">
                    {onRaise && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => setRaising({ id: m.id, title: m.text || (m.kind === "measure" ? `尺寸核对：${describe(m)}` : "") })}
                      >
                        <MessageSquareShareIcon />
                        发起问题
                      </Button>
                    )}
                    <SaveToNotebook
                      note={() => ({
                        kind: "memo",
                        text: `【${label}】${describe(m) || "（未填写）"}`,
                        page: m.page,
                        fileRef: { id: fileId, name: fileName },
                      })}
                    >
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                        <BookmarkPlusIcon />
                        存入笔记本
                      </Button>
                    </SaveToNotebook>
                    <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground hover:text-destructive" onClick={() => remove(m.id)}>
                      <Trash2Icon />
                      删除
                    </Button>
                  </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
