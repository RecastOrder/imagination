"use client"

import { BookmarkPlusIcon, MapPinIcon, RulerIcon, SquareDashedIcon, Trash2Icon, XIcon } from "lucide-react"

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

/** 右侧标注列表：按页排列；选中的可以写批注、删除、存入笔记本 */
export function MarksPanel({
  api,
  fileId,
  fileName,
  unit,
  onClose,
  onJump,
}: {
  api: AnnotationsApi
  fileId: string
  fileName: string
  unit: "pt" | "px"
  onClose: () => void
  onJump: (m: Mark) => void
}) {
  const { data, selectedId, setSelectedId, update, remove } = api
  const marks = [...data.marks].sort((a, b) => a.page - b.page)
  const globalScale = data.scales.all
  const describe = (m: Mark) => {
    if (m.kind !== "measure") return m.text
    const len = formatLength(distance(m.x1, m.y1, m.x2, m.y2), scaleFor(data, m.page))
    return m.text ? `${len} · ${m.text}` : len
  }

  return (
    <aside aria-label="标注列表" className="flex w-72 shrink-0 flex-col border-l bg-surface">
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <span className="text-sm font-medium">标注</span>
        <span className="text-xs text-muted-foreground">{marks.length}</span>
        <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={onClose} aria-label="关闭标注列表">
          <XIcon />
        </Button>
      </div>
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
        {marks.length === 0 && <li className="px-2 py-8 text-center text-sm text-muted-foreground">还没有标注。选择上方的“标记”“框选”或“测量”开始。</li>}
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
                  <div className="flex gap-1">
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
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
