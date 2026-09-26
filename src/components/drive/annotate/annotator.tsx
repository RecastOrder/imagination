"use client"

import { useEffect, useRef, useState } from "react"
import { EyeIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Segmented } from "@/components/ui/segmented"
import { toast } from "@/components/ui/toast"
import { paperRatio, scaleFor, type Mark } from "@/lib/drive/annotations"
import type { Issue } from "@/lib/drive/issues"
import { AnnotateToolbar } from "./annotate-toolbar"
import { AnnotationLayer } from "./annotation-layer"
import { CalibrateDialog } from "./calibrate-dialog"
import { IssueLayer } from "./issue-layer"
import { IssuesPanel } from "./issues-panel"
import { MarksPanel } from "./marks-panel"
import { useAnnotations, type Tool } from "./use-annotations"
import { useIssues } from "./use-issues"

const KEYS: Record<string, Tool> = { v: "browse", p: "pin", r: "rect", m: "measure", c: "calibrate" }
/** 仅浏览的人：可以测量（量尺寸不改动文件），不能标记、框选 */
const READONLY_TOOLS: Tool[] = ["browse", "measure", "calibrate"]

/**
 * 把标注功能“装”到任意查看器上（PDF、图片、转换后的 Office 都用它）。
 * 查看器只需要：把 toolbar 放进工具栏、把 panel 放在右侧、每一页叠一个 layer(...)。
 *
 * 两类东西：
 * - 我的标注：只有自己看得到（存在自己的浏览器里）
 * - 问题：从某条标注“发起”，存在服务器，能看这个文件的人都看得到、能回复
 */
export function useAnnotator({
  fileId,
  fileName,
  unit,
  readOnly,
  focusIssue,
  onJump,
}: {
  fileId: string
  fileName: string
  /** 页面单位：PDF 是点（pt），图片是像素（px） */
  unit: "pt" | "px"
  /** 仅浏览：只能测量和校准，不能标记、框选 */
  readOnly?: boolean
  /** 打开时定位到某个问题（链接里的 ?issue=） */
  focusIssue?: string | null
  onJump?: (m: Mark) => void
}) {
  const api = useAnnotations(fileId)
  const { data, tool, setTool, selectedId, setSelectedId, add, remove, setScale } = api
  const issuesApi = useIssues(fileId)
  const [panel, setPanel] = useState(false)
  const [tab, setTab] = useState<"marks" | "issues">("marks")
  const [issueId, setIssueId] = useState<string | null>(null)
  const openIssues = issuesApi.issues.filter((i) => i.status === "open").length
  const openTab = (t: "marks" | "issues") => {
    setPanel(true)
    setTab(t)
  }
  /** 工具条上的按钮：面板已经开在这一栏就关掉，否则打开到这一栏 */
  const toggleTab = (t: "marks" | "issues") => (panel && tab === t ? setPanel(false) : openTab(t))

  const showIssue = (i: Issue) => {
    setIssueId(i.id)
    setTab("issues")
    setPanel(true)
    onJump?.(i.mark)
  }

  // 通过链接打开某个问题：问题列表读回来后定位一次
  const focused = useRef<string | null>(null)
  useEffect(() => {
    if (!focusIssue || focused.current === focusIssue || !issuesApi.loaded) return
    const i = issuesApi.issues.find((x) => x.id === focusIssue)
    focused.current = focusIssue
    if (!i) return
    // 等页面排好版再滚动过去
    const t = setTimeout(() => showIssue(i), 300)
    return () => clearTimeout(t)
  })
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
        if (KEYS[k] !== "browse") openTab("marks")
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
            <span className="hidden @4xl:inline">仅浏览：可测量，不能标注</span>
          </span>
        ) : undefined
      }
      tool={tool}
      onTool={(t) => {
        setTool(t)
        if (t !== "browse") openTab("marks")
      }}
      count={data.marks.length}
      panelOpen={panel && tab === "marks"}
      onTogglePanel={() => toggleTab("marks")}
      issues={{
        open: openIssues,
        active: panel && tab === "issues",
        onClick: () => toggleTab("issues"),
      }}
      calibrated={Object.keys(data.scales).length > 0}
    />
  )

  const layer = (page: number, pageW: number, pageH: number, displayScale: number) => (
    <>
    <IssueLayer
      pageW={pageW}
      pageH={pageH}
      displayScale={displayScale}
      issues={issuesApi.issues.filter((i) => i.mark.page === page)}
      selectedId={panel && tab === "issues" ? issueId : null}
      onSelect={(id) => {
        setIssueId(id)
        setTab("issues")
        setPanel(true)
      }}
    />
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
        setTab("marks")
      }}
      onCreate={(m) => {
        add(m)
        setPanel(true)
        setTab("marks")
      }}
      onCalibrate={(units, p) => setPending({ units, page: p })}
    />
    </>
  )

  // 发起问题：把这条标注交到服务器，成功后从“我的标注”里移走（避免同一处画两遍）
  const raise = async (m: Mark, title: string, mentions: string[]) => {
    try {
      const i = await issuesApi.raise({ mark: m, title, scale: scaleFor(data, m.page), fileName, mentions })
      remove(m.id)
      setIssueId(i.id)
      setTab("issues")
      const names = issuesApi.people.filter((p) => mentions.includes(p.email)).map((p) => p.name)
      toast(`已发起问题 #${i.number}${names.length ? `，已通知 ${names.join("、")}` : "，能看这个文件的人都可以看到"}`)
      return true
    } catch (e) {
      toast((e as Error).message)
      return false
    }
  }

  const panelEl = panel ? (
    <aside aria-label="标注与问题" className="flex w-72 shrink-0 flex-col border-l bg-surface">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Segmented
          label="标注与问题"
          size="sm"
          value={tab}
          onChange={setTab}
          options={[
            { value: "marks", label: `我的标注 ${data.marks.length}`, title: "只有你自己看得到" },
            { value: "issues", label: `问题 ${openIssues}`, title: "能看这个文件的人都看得到" },
          ]}
        />
        <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={() => setPanel(false)} aria-label="关闭">
          <XIcon />
        </Button>
      </div>
      {tab === "marks" ? (
        <MarksPanel api={api} fileId={fileId} fileName={fileName} unit={unit} onJump={(m) => onJump?.(m)} onRaise={readOnly ? undefined : raise} people={issuesApi.people} />
      ) : (
        <IssuesPanel api={issuesApi} canEdit={!readOnly} selectedId={issueId} onSelect={setIssueId} onJump={(i) => onJump?.(i.mark)} />
      )}
    </aside>
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
