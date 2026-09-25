"use client"

import type { Issue } from "@/lib/drive/issues"
import { cn } from "@/lib/utils"

/**
 * 问题层：画在个人标注下面。和个人标注的区别：
 * 形状用虚线 + 一个“#编号”标签（像图纸上的索引号），已关闭的变淡。
 * 只有标签可以点，不挡住下面的滚动和选字。
 */
export function IssueLayer({
  pageW,
  pageH,
  displayScale,
  issues,
  selectedId,
  onSelect,
}: {
  pageW: number
  pageH: number
  displayScale: number
  issues: Issue[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const px = 1 / displayScale
  if (issues.length === 0) return null
  return (
    <svg viewBox={`0 0 ${pageW} ${pageH}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-label="问题">
      {issues.map((i) => {
        const m = i.mark
        const sel = i.id === selectedId
        const dash = `${6 * px} ${4 * px}`
        const sw = (sel ? 2.5 : 1.5) * px
        const [ax, ay] = m.kind === "pin" ? [m.x, m.y] : m.kind === "rect" ? [m.x, m.y] : [m.x1, m.y1]
        const label = `#${i.number}`
        const w = (label.length * 7.5 + 12) * px
        const h = 18 * px
        return (
          <g key={i.id} className={cn("text-markup", i.status === "closed" && "opacity-40")}>
            {m.kind === "rect" && <rect x={m.x} y={m.y} width={m.w} height={m.h} className="fill-markup/5 stroke-current" strokeWidth={sw} strokeDasharray={dash} />}
            {m.kind === "measure" && <line x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} className="stroke-current" strokeWidth={sw} strokeDasharray={dash} />}
            <g
              role="button"
              aria-label={`问题 ${label}：${i.title}`}
              className="pointer-events-auto cursor-pointer"
              onPointerDown={(e) => {
                e.stopPropagation()
                onSelect(i.id)
              }}
            >
              {sel && <rect x={ax - 3 * px} y={ay - h - 3 * px} width={w + 6 * px} height={h + 6 * px} rx={6 * px} className="fill-markup/20" />}
              <rect x={ax} y={ay - h} width={w} height={h} rx={4 * px} className="fill-surface stroke-current" strokeWidth={1.5 * px} />
              <text x={ax + w / 2} y={ay - h / 2} dy={4 * px} textAnchor="middle" fontSize={11 * px} fontWeight={700} className="fill-current select-none">
                {label}
              </text>
            </g>
          </g>
        )
      })}
    </svg>
  )
}
