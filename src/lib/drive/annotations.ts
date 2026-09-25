import { createLocalStore } from "@/lib/local-store"

/**
 * 标注与测量。
 *
 * 坐标用“页面单位”：PDF 是 100% 缩放下的点（pt），图片是原始像素。
 * 这样放大缩小都不影响已经画好的标注，也能换算真实尺寸。
 *
 * 比例（scale）：每个页面单位代表多少毫米。用户在图上量一段已知长度（比如 150 mm）来校准。
 */
export type Mark =
  | { id: string; kind: "pin"; page: number; x: number; y: number; text: string }
  | { id: string; kind: "rect"; page: number; x: number; y: number; w: number; h: number; text: string }
  | { id: string; kind: "measure"; page: number; x1: number; y1: number; x2: number; y2: number; text: string }

export type MarkKind = Mark["kind"]

/** 新建时还没有 id（对联合类型逐个去掉 id） */
export type NewMark = Mark extends infer M ? (M extends Mark ? Omit<M, "id"> : never) : never

export interface FileAnnotations {
  marks: Mark[]
  /** 页码 → 每个页面单位多少毫米；"all" 表示所有页通用 */
  scales: Record<string, number>
}

export const EMPTY: FileAnnotations = { marks: [], scales: {} }

/** 旧版存在浏览器里的标注：只用于第一次打开时搬到服务器（见 use-annotations.ts），不再写入 */
export const annotationsStore = createLocalStore<Record<string, FileAnnotations>>("drive:annotations", {})

export function scaleFor(a: FileAnnotations, page: number): number | undefined {
  return a.scales[String(page)] ?? a.scales.all
}

export const distance = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1)

/** 长度显示：校准过显示毫米 / 米，没校准只显示页面单位并提示 */
export function formatLength(units: number, mmPerUnit?: number): string {
  if (!mmPerUnit) return `${units.toFixed(1)}（未校准）`
  const mm = units * mmPerUnit
  if (mm >= 10_000) return `${(mm / 1000).toLocaleString("zh-CN", { maximumFractionDigits: 2 })} m`
  return `${Math.round(mm).toLocaleString("zh-CN")} mm`
}

/**
 * PDF 的页面单位是“点”（1/72 英寸 ≈ 0.3528 mm 纸面长度），
 * 所以校准后可以推算出图纸比例，比如 1:100。图片没有物理尺寸，不推算。
 */
export function paperRatio(mmPerUnit: number, unit: "pt" | "px") {
  if (unit !== "pt") return null
  const r = mmPerUnit / (25.4 / 72)
  return r >= 1 ? `约 1:${Math.round(r)}` : null
}
