"use client"

import { useRef, useState } from "react"
import { FileSearchIcon, LoaderCircleIcon, PlusIcon, Trash2Icon, UploadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { pdfText } from "@/lib/drive/pdf-text"
import { PROJECT_TREES } from "@/lib/drive/sample-tree"
import type { DriveNode } from "@/lib/drive/types"
import { extractConditions, type ConditionCandidate } from "@/lib/projects/extract-conditions"
import type { Condition } from "@/lib/projects/types"
import { cn } from "@/lib/utils"

type Row = Omit<Condition, "value"> & { value: string }

const PRESETS: Omit<Condition, "value" | "source">[] = [
  { key: "far", label: "容积率", op: "<=" },
  { key: "coverage", label: "建筑密度", op: "<=", unit: "%" },
  { key: "green", label: "绿地率", op: ">=", unit: "%" },
  { key: "height", label: "建筑高度", op: "<=", unit: "m" },
  { key: "parking", label: "机动车停车位", op: ">=", unit: "个" },
]
const OPS: { value: Condition["op"]; label: string }[] = [
  { value: "<=", label: "≤ 不大于" },
  { value: ">=", label: "≥ 不小于" },
  { value: "=", label: "= 等于" },
]

/** 项目文件里的 PDF（演示：示例文件树）；上线后从项目文件夹列出 */
function projectPdfs(projectId: string) {
  const out: { name: string; url: string }[] = []
  const walk = (n: DriveNode) => {
    if (n.type === "folder") n.children.forEach(walk)
    else if (n.type === "file" && n.url && /\.pdf$/i.test(n.name)) out.push({ name: n.name, url: n.url })
  }
  const t = PROJECT_TREES[projectId]
  if (t) walk(t)
  return out
}

/**
 * 规划条件的录入（已定：手动录入 和 PDF 识别 两种都要）。
 *
 *   ┌ 规划条件 ────────────────────────────────────────────┐
 *   │ [从 PDF 识别：规划设计条件通知书.pdf ▾] [上传 PDF]       │
 *   │ ┌ 识别到 6 条，请对照原文核对 ──────────────────────┐  │
 *   │ │ ☑ 容积率 ≤ 2.5     「1. 容积率：不大于 2.5；」     │  │ ← 每条都带原文
 *   │ │ ☑ 绿地率 ≥ 35%     「3. 绿地率：不小于 35%；」     │  │
 *   │ └────────────────────────────── [加入选中的 6 条] ┘  │
 *   │ 名称      比较     限值   单位  出处           ×     │ ← 手动录入 / 修改
 *   │ [+ 容积率] [+ 绿地率] … [+ 空白一条]                   │
 *   │                                     [取消] [保存]    │
 *   └──────────────────────────────────────────────────────┘
 */
export function ConditionsEditor({
  open,
  onOpenChange,
  projectId,
  conditions,
  startWithPdf,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  projectId: string
  conditions: Condition[]
  /** 打开时先展开“从 PDF 识别” */
  startWithPdf?: boolean
  onSave: (conditions: Condition[]) => Promise<boolean>
}) {
  const toRows = (cs: Condition[]): Row[] => cs.map((c) => ({ ...c, value: String(c.value) }))
  const [rows, setRows] = useState<Row[]>(() => toRows(conditions))
  const [pdfOpen, setPdfOpen] = useState(!!startWithPdf)
  const [reading, setReading] = useState(false)
  const [found, setFound] = useState<{ file: string; list: ConditionCandidate[]; picked: Set<number> } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const pdfs = projectPdfs(projectId)

  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const add = (p?: (typeof PRESETS)[number]) =>
    setRows((r) => [...r, { key: p?.key ?? `c${Date.now().toString(36)}`, label: p?.label ?? "", op: p?.op ?? "<=", unit: p?.unit, value: "", source: "手动录入" }])

  const recognize = async (file: string, data: ArrayBuffer) => {
    setReading(true)
    setMessage(null)
    setFound(null)
    try {
      const text = await pdfText(data)
      if (!text) return setMessage(`「${file}」读不到文字，可能是扫描件。扫描件需要 OCR（接入 AI 后支持），现在请手动录入。`)
      const list = extractConditions(text, `${file.replace(/\.pdf$/i, "")}（自动识别）`)
      if (list.length === 0) return setMessage(`「${file}」里没有找到常见指标（容积率、绿地率、建筑密度、限高、停车位）。请手动录入。`)
      setFound({ file, list, picked: new Set(list.map((_, i) => i)) })
    } catch {
      setMessage("PDF 读取失败，请确认文件没有损坏或加密。")
    } finally {
      setReading(false)
    }
  }

  const fromProject = async (url: string, name: string) => recognize(name, await (await fetch(url)).arrayBuffer())

  const accept = () => {
    if (!found) return
    const chosen = found.list.filter((_, i) => found.picked.has(i))
    setRows((r) => {
      const next = [...r]
      for (const c of chosen) {
        const row: Row = { key: c.key, label: c.label, op: c.op, unit: c.unit, value: String(c.value), source: c.source }
        const at = next.findIndex((x) => x.key === c.key || x.label === c.label)
        if (at >= 0) next[at] = row
        else next.push(row)
      }
      return next
    })
    setFound(null)
    setPdfOpen(false)
  }

  const invalid = rows.some((r) => !r.label.trim() || r.value.trim() === "" || !Number.isFinite(Number(r.value)))
  const save = async () => {
    setSaving(true)
    const ok = await onSave(rows.map((r) => ({ ...r, value: Number(r.value) })))
    setSaving(false)
    if (ok) onOpenChange(false)
  }

  const input = "h-8 w-full rounded-md border border-input bg-surface px-2 text-sm outline-none focus:border-ring"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[min(96vw,48rem)] overflow-y-auto">
        <DialogTitle>规划条件</DialogTitle>
        <DialogDescription>手动录入，或者从规划条件通知书（PDF）自动识别后逐条核对。保存后“指标核对”按这些限值做数字比较。</DialogDescription>

        {/* 从 PDF 识别 */}
        <section className="mt-4 rounded-lg border p-3">
          <button type="button" onClick={() => setPdfOpen((v) => !v)} aria-expanded={pdfOpen} className="flex w-full cursor-pointer items-center gap-2 text-left text-sm font-medium">
            <FileSearchIcon className="size-4 text-muted-foreground" />
            从 PDF 识别
            <span className="text-xs font-normal text-muted-foreground">识别结果只是候选，需要本人对照原文确认</span>
          </button>
          {pdfOpen && (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {pdfs.map((f) => (
                  <Button key={f.url} variant="outline" size="sm" disabled={reading} onClick={() => fromProject(f.url, f.name)}>
                    {f.name}
                  </Button>
                ))}
                <Button variant="outline" size="sm" disabled={reading} onClick={() => fileInput.current?.click()}>
                  <UploadIcon />
                  上传 PDF
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ""
                    if (f) recognize(f.name, await f.arrayBuffer())
                  }}
                />
              </div>
              {reading && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                  <LoaderCircleIcon className="size-4 animate-spin" />
                  正在读取文字…
                </p>
              )}
              {message && <p className="rounded-md bg-surface-sunken px-3 py-2 text-sm">{message}</p>}
              {found && (
                <div className="rounded-md bg-surface-sunken p-3">
                  <p className="text-sm">
                    在「{found.file}」里识别到 <strong>{found.list.length}</strong> 条，请对照原文核对后勾选：
                  </p>
                  <ul className="mt-2 space-y-1">
                    {found.list.map((c, i) => (
                      <li key={c.key}>
                        <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-surface">
                          <input
                            type="checkbox"
                            className="mt-1 accent-primary"
                            checked={found.picked.has(i)}
                            onChange={(e) => {
                              const picked = new Set(found.picked)
                              if (e.target.checked) picked.add(i)
                              else picked.delete(i)
                              setFound({ ...found, picked })
                            }}
                          />
                          <span className="w-40 shrink-0 text-sm font-medium tabular-nums">
                            {c.label} {c.op === "<=" ? "≤" : c.op === ">=" ? "≥" : "="} {c.value}
                            {c.unit}
                          </span>
                          <span className="min-w-0 flex-1 font-serif text-sm text-muted-foreground">「{c.snippet}」</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" variant="secondary" disabled={found.picked.size === 0} onClick={accept}>
                      加入选中的 {found.picked.size} 条
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 手动录入 / 修改 */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-1.5 font-medium">名称</th>
                <th className="pb-1.5 font-medium">比较</th>
                <th className="pb-1.5 font-medium">限值</th>
                <th className="pb-1.5 font-medium">单位</th>
                <th className="pb-1.5 font-medium">出处</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.key}>
                  <td className="py-1 pr-2">
                    <input value={r.label} onChange={(e) => set(i, { label: e.target.value })} placeholder="如：容积率" aria-label="名称" className={cn(input, "w-32", !r.label.trim() && "border-destructive/60")} />
                  </td>
                  <td className="py-1 pr-2">
                    <select value={r.op} onChange={(e) => set(i, { op: e.target.value as Condition["op"] })} aria-label={`${r.label} 比较方式`} className={cn(input, "w-28")}>
                      {OPS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      value={r.value}
                      inputMode="decimal"
                      onChange={(e) => set(i, { value: e.target.value })}
                      aria-label={`${r.label} 限值`}
                      className={cn(input, "w-20 text-right tabular-nums", (r.value.trim() === "" || !Number.isFinite(Number(r.value))) && "border-destructive/60")}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input value={r.unit ?? ""} onChange={(e) => set(i, { unit: e.target.value || undefined })} aria-label={`${r.label} 单位`} className={cn(input, "w-14")} />
                  </td>
                  <td className="py-1 pr-2">
                    <input value={r.source} onChange={(e) => set(i, { source: e.target.value })} aria-label={`${r.label} 出处`} className={cn(input, "w-44")} />
                  </td>
                  <td className="py-1">
                    <Button variant="ghost" size="icon-sm" aria-label={`删除 ${r.label}`} onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>
                      <Trash2Icon />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">还没有条件。点下面的常用指标快速添加。</p>}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.filter((p) => !rows.some((r) => r.key === p.key || r.label === p.label)).map((p) => (
            <Button key={p.key} variant="outline" size="sm" onClick={() => add(p)}>
              <PlusIcon />
              {p.label}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => add()}>
            <PlusIcon />
            空白一条
          </Button>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          {invalid && <p className="mr-auto text-xs text-destructive">每条都要有名称和数字限值</p>}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={save} disabled={invalid || saving}>
            {saving ? "正在保存…" : "保存规划条件"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
