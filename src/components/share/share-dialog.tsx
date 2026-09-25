"use client"

import { useState } from "react"
import { ShieldCheckIcon, UserPlusIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import type { AccessLevel } from "@/lib/access"
import { covers, type Share } from "@/lib/drive/shares"
import { LevelSelect } from "./access-menu"

/**
 * 访问权限面板（参考 Google Drive / 飞书的“共享”，但只在平台内部）：
 * 文件留在原处，不复制、不发送、没有外部链接——只是让单位里的某位同事在平台上也能打开它。
 *
 *   ┌ 谁可以访问「参考图片」 ──────────────┐
 *   │ [选择同事 ▾] [仅浏览 ▾] [添加]      │ ← 加人
 *   │ 可以访问的人                        │
 *   │  李娜（主人）  所有者 · 管理员        │
 *   │  张明          浏览 + 编辑 ▾   ×     │ ← 改档位 / 取消
 *   │  王磊          仅浏览（来自上级）      │ ← 继承，只读
 *   │ 🛡 只在平台内部，不产生外部链接  [完成] │
 *   └────────────────────────────────────┘
 *
 * 每次改动立刻保存（不需要再点“保存”），失败则提示并保持原样。
 */
export function ShareDialog({
  open,
  onOpenChange,
  item,
  owner,
  me,
  shares,
  onSharesChange,
  directory,
  demo,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  item: { id: string; name: string; folder: boolean }
  /** 文件主人的邮箱（管理员替别人设置时，主人不是自己） */
  owner: string
  /** 当前登录的人 */
  me: string
  /** 共享记录（面板里筛出和这一项有关的） */
  shares: Share[]
  onSharesChange: (next: Share[]) => void
  directory: { email: string; name: string }[]
  /** 样张页用：不请求接口，只在本地模拟 */
  demo?: boolean
}) {
  const [grantee, setGrantee] = useState("")
  const [level, setLevel] = useState<AccessLevel>("view")
  const [busy, setBusy] = useState(false)

  const direct = shares.filter((s) => s.itemId === item.id)
  // 上级文件夹的共享也覆盖这一项：列出来但不在这里改（去上级文件夹改）
  const inherited = shares.filter((s) => s.itemId !== item.id && covers(s, item.id))
  const nameOf = (email: string) => directory.find((d) => d.email === email)?.name ?? email.split("@")[0]
  const candidates = directory.filter((d) => d.email !== owner && !direct.some((s) => s.grantee === d.email))

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
    toast(`${nameOf(s.grantee)} 现在可以访问（${level === "edit" ? "浏览 + 编辑" : "仅浏览"}）`)
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

  const ownerLabel = owner === me ? "你" : nameOf(owner)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,32rem)]">
        <DialogTitle className="truncate pr-6">谁可以访问「{item.name}」</DialogTitle>
        <DialogDescription>
          文件留在原处，不复制、不发送。选中的同事可以在平台里打开它（“文件浏览 · 我的 · 共享给我的”）。
          {item.folder && "文件夹里的所有文件，包括以后放进去的，都按同样的权限。"}
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
          <LevelSelect value={level} onChange={setLevel} label="访问档位" />
          <Button type="submit" disabled={!grantee || busy}>
            <UserPlusIcon />
            添加
          </Button>
        </form>

        <p className="mt-5 mb-1.5 text-xs font-medium text-muted-foreground">可以访问的人</p>
        <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border">
          <li className="flex items-center gap-3 px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{ownerLabel}</span>
            <span className="px-2 text-sm text-muted-foreground">所有者</span>
          </li>
          {direct.map((s) => (
            <li key={s.id} className="flex items-center gap-2 px-3 py-1.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{nameOf(s.grantee)}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.grantee}</span>
              </span>
              <LevelSelect value={s.level} onChange={(l) => change(s, l)} label={`${nameOf(s.grantee)} 的权限`} />
              <Button variant="ghost" size="icon-sm" disabled={busy} aria-label={`取消 ${nameOf(s.grantee)} 的访问`} title="取消访问" onClick={() => remove(s)}>
                <XIcon />
              </Button>
            </li>
          ))}
          {inherited.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{nameOf(s.grantee)}</span>
                <span className="block truncate text-xs text-muted-foreground">来自上级文件夹「{s.itemName}」</span>
              </span>
              <span className="px-2 text-sm text-muted-foreground">{s.level === "edit" ? "浏览 + 编辑" : "仅浏览"}</span>
            </li>
          ))}
          {/* 如实告知：管理员有全部权限，能看到所有人的文件 */}
          <li className="flex items-center gap-3 px-3 py-2 text-muted-foreground">
            <span className="min-w-0 flex-1 truncate text-sm">管理员</span>
            <span className="px-2 text-sm">全部权限</span>
          </li>
        </ul>

        <div className="mt-5 flex items-center gap-2">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheckIcon className="size-3.5 shrink-0" />
            只在平台内部，没有外部链接
          </p>
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
