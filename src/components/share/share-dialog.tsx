"use client"

import { useState } from "react"
import { CheckIcon, LinkIcon, UserPlusIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import type { AccessLevel } from "@/lib/access"
import { covers, type Share } from "@/lib/drive/shares"
import { LevelSelect } from "./access-menu"

/**
 * 共享面板（参考 Google Drive / Figma / 飞书的“分享”）：
 *
 *   ┌ 共享「参考图片」 ───────────────────┐
 *   │ [选择同事 ▾] [仅浏览 ▾] [共享]      │ ← 加人
 *   │ 有权访问的人                        │
 *   │  你           所有者               │
 *   │  李娜         浏览 + 编辑 ▾   ×     │ ← 改档位 / 取消
 *   │  王磊         仅浏览（来自上级）      │ ← 继承，只读
 *   │ [复制链接]                  [完成]  │
 *   └────────────────────────────────────┘
 *
 * 每次改动立刻保存（不需要再点“保存”），失败则提示并保持原样。
 */
export function ShareDialog({
  open,
  onOpenChange,
  item,
  shares,
  onSharesChange,
  directory,
  demo,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  item: { id: string; name: string; folder: boolean }
  /** 我共享出去的全部记录（面板里筛出和这一项有关的） */
  shares: Share[]
  onSharesChange: (next: Share[]) => void
  directory: { email: string; name: string }[]
  /** 样张页用：不请求接口，只在本地模拟 */
  demo?: boolean
}) {
  const [grantee, setGrantee] = useState("")
  const [level, setLevel] = useState<AccessLevel>("view")
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const direct = shares.filter((s) => s.itemId === item.id)
  // 上级文件夹的共享也覆盖这一项：列出来但不在这里改（去上级文件夹改）
  const inherited = shares.filter((s) => s.itemId !== item.id && covers(s, item.id))
  const nameOf = (email: string) => directory.find((d) => d.email === email)?.name ?? email.split("@")[0]
  const candidates = directory.filter((d) => !direct.some((s) => s.grantee === d.email))

  const call = async (method: string, body?: Record<string, string>, query = "") => {
    if (demo) return fakeShare(shares, item, body, query)
    setBusy(true)
    try {
      const r = await fetch(`/api/shares${query}`, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await r.json()
      if (!r.ok) {
        toast(data.error ?? "操作失败")
        return null
      }
      return data
    } finally {
      setBusy(false)
    }
  }

  const add = async () => {
    if (!grantee) return
    const s: Share | null = await call("POST", { itemId: item.id, grantee, level })
    if (!s) return
    onSharesChange([...shares.filter((x) => x.id !== s.id), s])
    setGrantee("")
    toast(`已共享给 ${nameOf(s.grantee)}（${level === "edit" ? "浏览 + 编辑" : "仅浏览"}）`)
  }

  const change = async (s: Share, l: AccessLevel) => {
    const next: Share | null = await call("PATCH", { id: s.id, level: l })
    if (next) onSharesChange(shares.map((x) => (x.id === next.id ? next : x)))
  }

  const remove = async (s: Share) => {
    if (await call("DELETE", undefined, `?id=${encodeURIComponent(s.id)}`)) {
      onSharesChange(shares.filter((x) => x.id !== s.id))
      toast(`已取消 ${nameOf(s.grantee)} 的访问`)
    }
  }

  const copy = async () => {
    const url = `${location.origin}/browse?f=${encodeURIComponent(item.id)}`
    await navigator.clipboard?.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,32rem)]">
        <DialogTitle className="truncate pr-6">共享「{item.name}」</DialogTitle>
        <DialogDescription>
          {item.folder ? "文件夹里的所有文件（包括以后放进去的）都按同样的权限共享。" : "对方会在“文件浏览 · 我的 · 共享给我的”里看到它。"}
        </DialogDescription>

        <form
          className="mt-4 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <select
            value={grantee}
            onChange={(e) => setGrantee(e.target.value)}
            aria-label="选择同事"
            className="h-9 min-w-0 flex-1 basis-48 rounded-md border border-input bg-surface px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
          >
            <option value="">选择同事…</option>
            {candidates.map((c) => (
              <option key={c.email} value={c.email}>
                {c.name}（{c.email}）
              </option>
            ))}
          </select>
          <LevelSelect value={level} onChange={setLevel} label="共享档位" />
          <Button type="submit" disabled={!grantee || busy}>
            <UserPlusIcon />
            共享
          </Button>
        </form>

        <p className="mt-5 mb-1.5 text-xs font-medium text-muted-foreground">有权访问的人</p>
        <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border">
          <li className="flex items-center gap-3 px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">你</span>
            <span className="px-2 text-sm text-muted-foreground">所有者</span>
          </li>
          {direct.map((s) => (
            <li key={s.id} className="flex items-center gap-2 px-3 py-1.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{nameOf(s.grantee)}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.grantee}</span>
              </span>
              <LevelSelect value={s.level} onChange={(l) => change(s, l)} label={`${nameOf(s.grantee)} 的权限`} />
              <Button variant="ghost" size="icon-sm" disabled={busy} aria-label={`取消 ${nameOf(s.grantee)} 的访问`} title="取消共享" onClick={() => remove(s)}>
                <XIcon />
              </Button>
            </li>
          ))}
          {inherited.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{nameOf(s.grantee)}</span>
                <span className="block truncate text-xs text-muted-foreground">来自上级文件夹「{s.itemName}」的共享</span>
              </span>
              <span className="px-2 text-sm text-muted-foreground">{s.level === "edit" ? "浏览 + 编辑" : "仅浏览"}</span>
            </li>
          ))}
        </ul>
        {direct.length === 0 && inherited.length === 0 && <p className="mt-2 text-xs text-muted-foreground">目前只有你自己能看到。</p>}

        <div className="mt-5 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? <CheckIcon /> : <LinkIcon />}
            {copied ? "已复制" : "复制链接"}
          </Button>
          <span className="hidden text-xs text-muted-foreground sm:inline">只有上面的人能打开</span>
          <Button className="ml-auto" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            完成
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** 样张页用的本地模拟：按请求内容拼出一条共享记录 */
function fakeShare(shares: Share[], item: { id: string; name: string; folder: boolean }, body?: Record<string, string>, query = "") {
  const id = body?.id ?? new URLSearchParams(query).get("id") ?? `demo${Date.now()}`
  const cur = shares.find((x) => x.id === id)
  return { ...cur, id, owner: "demo", itemName: item.name, folder: item.folder, createdAt: Date.now(), ...body, itemId: body?.itemId ?? cur?.itemId ?? item.id }
}
