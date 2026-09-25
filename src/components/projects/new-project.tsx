"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MapPinIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { LOCATIONS, matchRequirements } from "@/lib/projects/regional"
import { STAGES, TYPES } from "@/lib/projects/types"

/**
 * 新建项目（已定：管理员 + 管理员指定的人可以新建）。
 *
 *   ┌ 新建项目 ─────────────────────────────┐
 *   │ 项目名称 [                        ]   │
 *   │ 类型 [住宅 ▾]      阶段 [方案 ▾]        │
 *   │ 位置 [上海市 ▾][上海市 ▾][徐汇区 ▾]      │
 *   │ 详细位置 [                        ]   │
 *   │ 负责人 [我自己 ▾]                      │
 *   │ 📍 将自动匹配 国家 3 · 上海市 2 · 徐汇区 2 │ ← 填完位置就能看到结果
 *   │                     [取消] [创建项目]  │
 *   └──────────────────────────────────────┘
 */
export function NewProject({
  me,
  isAdmin,
  directory,
}: {
  me: string
  isAdmin: boolean
  /** 可以当负责人的人（单位成员，未停用） */
  directory: { email: string; name: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const provinces = Object.keys(LOCATIONS)
  const blank = () => {
    const province = provinces[0]
    const city = Object.keys(LOCATIONS[province])[0]
    return { name: "", type: TYPES[0], stage: STAGES[0], province, city, district: LOCATIONS[province][city][0], address: "", lead: me }
  }
  const [f, setF] = useState(blank)
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }))

  const location = { province: f.province, city: f.city, district: f.district, address: f.address }
  const matched = matchRequirements(location, f.type)
  const count = (lv: string) => matched.filter((r) => r.level === lv).length

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: f.name, type: f.type, stage: f.stage, location, lead: f.lead }),
      })
      const data = await r.json()
      if (!r.ok) return setError(data.error ?? "创建失败")
      toast(`已创建「${data.name}」`)
      setOpen(false)
      setF(blank())
      router.push(`/projects/${data.id}`)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const sel =
    "mt-1 h-9 w-full rounded-md border border-input bg-surface px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon />
        新建项目
      </Button>
      <Dialog open={open} onOpenChange={(o) => (setOpen(o), setError(null))}>
        <DialogContent className="w-[min(94vw,34rem)]">
          <DialogTitle>新建项目</DialogTitle>
          <DialogDescription>位置录到区，创建后会按位置和类型自动匹配国家 / 省市 / 区三级要求。</DialogDescription>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-6"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <label className="sm:col-span-6">
              <span className="text-xs text-muted-foreground">项目名称</span>
              <Input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="例如：某办公楼项目" className="mt-1" autoFocus aria-invalid={!!error && !f.name.trim()} />
            </label>
            <label className="sm:col-span-3">
              <span className="text-xs text-muted-foreground">类型</span>
              <select value={f.type} onChange={(e) => set({ type: e.target.value })} className={sel}>
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-3">
              <span className="text-xs text-muted-foreground">阶段</span>
              <select value={f.stage} onChange={(e) => set({ stage: e.target.value })} className={sel}>
                {STAGES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="text-xs text-muted-foreground">省 / 直辖市</span>
              <select
                value={f.province}
                onChange={(e) => {
                  const province = e.target.value
                  const city = Object.keys(LOCATIONS[province])[0]
                  set({ province, city, district: LOCATIONS[province][city][0] })
                }}
                className={sel}
              >
                {provinces.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="text-xs text-muted-foreground">市</span>
              <select value={f.city} onChange={(e) => set({ city: e.target.value, district: LOCATIONS[f.province][e.target.value][0] })} className={sel}>
                {Object.keys(LOCATIONS[f.province]).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="text-xs text-muted-foreground">区</span>
              <select value={f.district} onChange={(e) => set({ district: e.target.value })} className={sel}>
                {LOCATIONS[f.province][f.city].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-6">
              <span className="text-xs text-muted-foreground">详细位置（可选）</span>
              <Input value={f.address} onChange={(e) => set({ address: e.target.value })} placeholder="路名、地块编号" className="mt-1" />
            </label>
            <label className="sm:col-span-6">
              <span className="text-xs text-muted-foreground">项目负责人</span>
              <select value={f.lead} onChange={(e) => set({ lead: e.target.value })} className={sel}>
                <option value={me}>我自己</option>
                {directory
                  .filter((d) => d.email !== me)
                  .map((d) => (
                    <option key={d.email} value={d.email}>
                      {d.name}（{d.email}）
                    </option>
                  ))}
              </select>
              {f.lead !== me && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {isAdmin ? "负责人之后可以自己拉人、调整权限。" : "你会作为“可编辑”成员加入这个项目。"}
                </span>
              )}
            </label>

            {/* 即时反馈：位置一选好就告诉你会匹配到多少要求 */}
            <p className="flex items-center gap-1.5 rounded-lg bg-surface-sunken px-3 py-2 text-sm text-muted-foreground sm:col-span-6" aria-live="polite">
              <MapPinIcon className="size-4 shrink-0" />
              将自动匹配：国家 {count("国家")} 项 · {f.city} {count("省市")} 项 · {f.district} {count("区")} 项
            </p>

            {error && (
              <p role="alert" className="text-sm text-destructive sm:col-span-6">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 sm:col-span-6">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={busy || !f.name.trim()}>
                {busy ? "正在创建…" : "创建项目"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
