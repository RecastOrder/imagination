"use client"

import { useRef, useState } from "react"

import { distance, formatLength, type Mark, type NewMark } from "@/lib/drive/annotations"
import { cn } from "@/lib/utils"
import type { Tool } from "./use-annotations"

interface Draft {
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * 叠加在一页（PDF 页面 / 图片）上的标注层（SVG）。
 * - 坐标系 = 页面单位（viewBox），放大缩小时标注跟着页面走
 * - 线宽、文字不随缩放变粗变大（按当前显示比例换算）
 * - 按住 Shift：测量 / 校准时强制水平或垂直（画图时的“正交模式”）
 * - 浏览模式下不拦截鼠标，照常滚动、选字；只有标注本身可以点选
 */
export function AnnotationLayer({
  page,
  pageW,
  pageH,
  displayScale,
  marks,
  mmPerUnit,
  tool,
  selectedId,
  onSelect,
  onCreate,
  onCalibrate,
}: {
  page: number
  pageW: number
  pageH: number
  /** 当前每个页面单位显示成多少屏幕像素 */
  displayScale: number
  marks: Mark[]
  mmPerUnit?: number
  tool: Tool
  selectedId: string | null
  onSelect: (id: string | null) => void
  onCreate: (m: NewMark) => void
  onCalibrate: (units: number, page: number, line: Draft) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const px = 1 / displayScale // 一个屏幕像素 = 多少页面单位
  const drawing = tool !== "browse"

  const toPage = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect()
    return {
      x: Math.min(pageW, Math.max(0, ((e.clientX - r.left) / r.width) * pageW)),
      y: Math.min(pageH, Math.max(0, ((e.clientY - r.top) / r.height) * pageH)),
    }
  }

  const ortho = (d: Draft, shift: boolean): Draft => {
    if (!shift || tool === "rect") return d
    return Math.abs(d.x2 - d.x1) >= Math.abs(d.y2 - d.y1) ? { ...d, y2: d.y1 } : { ...d, x2: d.x1 }
  }

  const onDown = (e: React.PointerEvent) => {
    if (!drawing || e.button !== 0) return
    e.preventDefault()
    const p = toPage(e)
    if (tool === "pin") {
      onCreate({ kind: "pin", page, x: p.x, y: p.y, text: "" })
      return
    }
    svgRef.current!.setPointerCapture(e.pointerId)
    setDraft({ x1: p.x, y1: p.y, x2: p.x, y2: p.y })
  }
  const onMove = (e: React.PointerEvent) => {
    if (!draft) return
    const p = toPage(e)
    setDraft(ortho({ ...draft, x2: p.x, y2: p.y }, e.shiftKey))
  }
  const onUp = (e: React.PointerEvent) => {
    if (!draft) return
    const d = ortho(draft, e.shiftKey)
    setDraft(null)
    const len = distance(d.x1, d.y1, d.x2, d.y2)
    if (len < 6 * px) return // 太短，当作误点
    if (tool === "rect")
      onCreate({ kind: "rect", page, x: Math.min(d.x1, d.x2), y: Math.min(d.y1, d.y2), w: Math.abs(d.x2 - d.x1), h: Math.abs(d.y2 - d.y1), text: "" })
    else if (tool === "measure") onCreate({ kind: "measure", page, ...d, text: "" })
    else if (tool === "calibrate") onCalibrate(len, page, d)
  }

  const pins = marks.filter((m) => m.kind === "pin")

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${pageW} ${pageH}`}
      className={cn("absolute inset-0 h-full w-full touch-none", drawing ? "cursor-crosshair" : "pointer-events-none")}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={() => setDraft(null)}
      aria-label={`第 ${page} 页标注`}
    >
      {marks.map((m) => {
        const sel = m.id === selectedId
        const common = {
          className: "pointer-events-auto cursor-pointer text-markup",
          onPointerDown: (e: React.PointerEvent) => {
            if (drawing) return
            e.stopPropagation()
            onSelect(m.id)
          },
        }
        if (m.kind === "pin") {
          const n = pins.indexOf(m) + 1
          const r = 10 * px
          return (
            <g key={m.id} {...common} role="button" aria-label={`标记 ${n}：${m.text || "未填写"}`}>
              {sel && <circle cx={m.x} cy={m.y} r={r * 1.7} className="fill-markup/20" />}
              <circle cx={m.x} cy={m.y} r={r} className="fill-markup" />
              <text x={m.x} y={m.y} dy={4 * px} textAnchor="middle" fontSize={11 * px} fontWeight={700} className="fill-markup-foreground select-none">
                {n}
              </text>
            </g>
          )
        }
        if (m.kind === "rect") {
          return (
            <g key={m.id} {...common} role="button" aria-label={`框选：${m.text || "未填写"}`}>
              <rect x={m.x} y={m.y} width={m.w} height={m.h} className="fill-markup/5 stroke-current" strokeWidth={(sel ? 3 : 2) * px} />
              {m.text && (
                <text x={m.x} y={m.y - 5 * px} fontSize={12 * px} fontWeight={600} className="fill-current">
                  {m.text}
                </text>
              )}
            </g>
          )
        }
        return (
          <g key={m.id} {...common} role="button" aria-label={`测量：${formatLength(distance(m.x1, m.y1, m.x2, m.y2), mmPerUnit)}`}>
            <DimLine d={m} px={px} label={formatLength(distance(m.x1, m.y1, m.x2, m.y2), mmPerUnit)} strong={sel} />
          </g>
        )
      })}

      {draft && tool === "rect" && (
        <rect
          x={Math.min(draft.x1, draft.x2)}
          y={Math.min(draft.y1, draft.y2)}
          width={Math.abs(draft.x2 - draft.x1)}
          height={Math.abs(draft.y2 - draft.y1)}
          className="fill-markup/5 stroke-markup"
          strokeWidth={2 * px}
          strokeDasharray={`${6 * px} ${4 * px}`}
        />
      )}
      {draft && (tool === "measure" || tool === "calibrate") && (
        <g className="text-markup">
          <DimLine
            d={draft}
            px={px}
            dashed={tool === "calibrate"}
            label={tool === "calibrate" ? "校准线" : formatLength(distance(draft.x1, draft.y1, draft.x2, draft.y2), mmPerUnit)}
          />
        </g>
      )}
    </svg>
  )
}

/** 尺寸线：两端短竖线 + 中间标签（像 CAD 里的标注） */
function DimLine({ d, px, label, strong, dashed }: { d: Draft; px: number; label: string; strong?: boolean; dashed?: boolean }) {
  const ang = Math.atan2(d.y2 - d.y1, d.x2 - d.x1)
  const nx = -Math.sin(ang) * 7 * px
  const ny = Math.cos(ang) * 7 * px
  const mx = (d.x1 + d.x2) / 2
  const my = (d.y1 + d.y2) / 2
  const w = (label.length * 7 + 12) * px
  const h = 18 * px
  const sw = (strong ? 2.5 : 1.5) * px
  return (
    <>
      <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} className="stroke-current" strokeWidth={sw} strokeDasharray={dashed ? `${6 * px} ${4 * px}` : undefined} />
      <line x1={d.x1 - nx} y1={d.y1 - ny} x2={d.x1 + nx} y2={d.y1 + ny} className="stroke-current" strokeWidth={sw} />
      <line x1={d.x2 - nx} y1={d.y2 - ny} x2={d.x2 + nx} y2={d.y2 + ny} className="stroke-current" strokeWidth={sw} />
      <rect x={mx - w / 2} y={my - h / 2} width={w} height={h} rx={4 * px} className="fill-markup" />
      <text x={mx} y={my} dy={4 * px} textAnchor="middle" fontSize={11 * px} fontWeight={600} className="fill-markup-foreground select-none">
        {label}
      </text>
    </>
  )
}
