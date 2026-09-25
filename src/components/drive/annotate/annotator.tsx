"use client"

import { useEffect, useState } from "react"
import { EyeIcon } from "lucide-react"

import { toast } from "@/components/ui/toast"
import { paperRatio, scaleFor, type Mark } from "@/lib/drive/annotations"
import { AnnotateToolbar } from "./annotate-toolbar"
import { AnnotationLayer } from "./annotation-layer"
import { CalibrateDialog } from "./calibrate-dialog"
import { MarksPanel } from "./marks-panel"
import { useAnnotations, type Tool } from "./use-annotations"

const KEYS: Record<string, Tool> = { v: "browse", p: "pin", r: "rect", m: "measure", c: "calibrate" }
/** 仅浏览的人：可以测量（量尺寸不改动文件），不能标记、框选 */
const READONLY_TOOLS: Tool[] = ["browse", "measure", "calibrate"]

/**
 * 把标注功能“装”到任意查看器上（PDF、图片、转换后的 Office 都用它）。
 * 查看器只需要：把 toolbar 放进工具栏、把 panel 放在右侧、每一页叠一个 layer(...)。
 */
export function useAnnotator({
  fileId,
  fileName,
  unit,
  readOnly,
  onJump,
}: {
  fileId: string
  fileName: string
  /** 页面单位：PDF 是点（pt），图片是像素（px） */
  unit: "pt" | "px"
  /** 仅浏览：只能测量和校准，不能标记、框选 */
  readOnly?: boolean
  onJump?: (m: Mark) => void
}) {
  const api = useAnnotations(fileId)
  const { data, tool, setTool, selectedId, setSelectedId, add, remove, setScale } = api
  const [panel, setPanel] = useState(false)
  const [pending, setPending] = useState<{ units: number; page: number } | null>(null)

  // 快捷键：V P R M C 切换工具，Esc 回到浏览，Delete 删除选中的标注（在输入框里打字时不触发）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest("input, textarea, [contenteditable=true]") || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (KEYS[k] && (!readOnly || READONLY_TOOLS.includes(KEYS[k]))) {
        setTool(KEYS[k])
        // 选了画图工具就先打开列表：让画面在开始画之前就定下来，不会画到一半突然变窄
        if (KEYS[k] !== "browse") setPanel(true)
      }
      else if (e.key === "Escape") {
        setTool("browse")
        setSelectedId(null)
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) remove(selectedId)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [readOnly, setTool, setSelectedId, selectedId, remove])

  const toolbar = (
    <AnnotateToolbar
      tools={readOnly ? READONLY_TOOLS : undefined}
      note={
        readOnly ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground" title="你对这个文件是“仅浏览”权限：测量结果只有你自己看得到">
            <EyeIcon className="size-3.5" />
            <span className="hidden lg:inline">仅浏览：可测量，不能标注</span>
          </span>
        ) : undefined
      }
      tool={tool}
      onTool={(t) => {
        setTool(t)
        if (t !== "browse") setPanel(true)
      }}
      count={data.marks.length}
      panelOpen={panel}
      onTogglePanel={() => setPanel((v) => !v)}
      calibrated={Object.keys(data.scales).length > 0}
    />
  )

  const layer = (page: number, pageW: number, pageH: number, displayScale: number) => (
    <AnnotationLayer
      page={page}
      pageW={pageW}
      pageH={pageH}
      displayScale={displayScale}
      marks={data.marks.filter((m) => m.page === page)}
      mmPerUnit={scaleFor(data, page)}
      tool={tool}
      selectedId={selectedId}
      onSelect={(id) => {
        setSelectedId(id)
        setPanel(true)
      }}
      onCreate={(m) => {
        add(m)
        setPanel(true)
      }}
      onCalibrate={(units, p) => setPending({ units, page: p })}
    />
  )

  const panelEl = panel ? (
    <MarksPanel api={api} fileId={fileId} fileName={fileName} unit={unit} onClose={() => setPanel(false)} onJump={(m) => onJump?.(m)} />
  ) : null

  const dialog = (
    <CalibrateDialog
      open={!!pending}
      page={pending?.page ?? 1}
      onCancel={() => setPending(null)}
      onConfirm={(realMm, scope) => {
        if (!pending) return
        const mmPerUnit = realMm / pending.units
        setScale(scope === "all" ? "all" : pending.page, mmPerUnit)
        setPending(null)
        setTool("measure")
        const ratio = paperRatio(mmPerUnit, unit)
        toast(`比例已校准${ratio ? `（${ratio}）` : ""}，现在可以测量了`)
      }}
    />
  )

  return { toolbar, layer, panel: panelEl, dialog, api }
}
