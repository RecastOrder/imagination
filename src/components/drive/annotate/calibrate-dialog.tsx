"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Segmented } from "@/components/ui/segmented"

/**
 * 校准比例：告诉系统“刚才画的这条线，实际是多长”。
 * 例如沿图上标注为 150 的尺寸线拖一条线，输入 150 mm，之后所有测量都按这个比例换算。
 */
export function CalibrateDialog({
  open,
  page,
  onCancel,
  onConfirm,
}: {
  open: boolean
  page: number
  onCancel: () => void
  onConfirm: (realMm: number, scope: "page" | "all") => void
}) {
  const [value, setValue] = useState("")
  const [unit, setUnit] = useState<"mm" | "m">("mm")
  const [scope, setScope] = useState<"all" | "page">("all")
  const n = Number(value)
  const valid = Number.isFinite(n) && n > 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogTitle>这段线实际有多长？</DialogTitle>
        <DialogDescription>沿图上一段已知尺寸（比如标注为 150 的尺寸线）画的线，输入它的实际长度。</DialogDescription>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) onConfirm(unit === "m" ? n * 1000 : n, scope)
            setValue("")
          }}
        >
          <div className="flex gap-2">
            <Input autoFocus inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="如 150" aria-label="实际长度" className="h-10 flex-1 text-base" />
            <Segmented label="单位" value={unit} onChange={setUnit} options={[{ value: "mm", label: "mm" }, { value: "m", label: "m" }]} className="h-10 items-center" />
          </div>
          <fieldset>
            <legend className="mb-2 text-sm text-muted-foreground">应用范围</legend>
            <Segmented
              label="应用范围"
              value={scope}
              onChange={setScope}
              options={[
                { value: "all", label: "所有页面" },
                { value: "page", label: `仅第 ${page} 页` },
              ]}
            />
          </fieldset>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              取消
            </Button>
            <Button type="submit" disabled={!valid}>
              设为比例
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
