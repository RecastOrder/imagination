"use client"

import { useCallback, useEffect, useState } from "react"
import { BoxesIcon, CheckCircle2Icon, CircleAlertIcon, DownloadIcon, LoaderIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAccount } from "@/components/account/account-provider"

/** Cairn gh_jobs.public() 的形状 */
export interface GhRequest {
  id: string
  text: string
  status: "pending" | "claimed" | "done" | "failed"
  error: string | null
  files: string[]
  assumptions: string[]
  model_confirmed: boolean | null
  created_at: string
  finished_at: string | null
}

const STATUS: Record<GhRequest["status"], string> = {
  pending: "排队中",
  claimed: "生成中",
  done: "已完成",
  failed: "没有成功",
}

type ListResult = { requests: GhRequest[] } | { error: string }

async function fetchList(): Promise<ListResult> {
  const r = await fetch("/api/gh/requests", { cache: "no-store" }).catch(() => null)
  const body = r ? await r.json().catch(() => null) : null
  if (!r || !r.ok) return { error: body?.error ?? "生成记录读不出来，请稍后再试" }
  return { requests: body?.requests ?? [] }
}

const file = (id: string, name: string) => `/api/gh/requests/${id}/files/${name}`

/**
 * Grasshopper 生成器：用中文描述想要的电池组，几分钟后拿回 .gh、.3dm 和两张图
 * （电池组连线图 · Rhino 透视图）。真正生成的是舰队上的 Rhino，一次只跑一单，一单约 5–10 分钟。
 * 生成记录跟着人走（本人看自己的，管理员看全部）；还不会自动存进项目文件夹。
 */
export function GhGenerator() {
  const { features } = useAccount()
  if (!features.tool_gh) {
    return (
      <section aria-label="Grasshopper 生成器" className="rounded-xl border bg-surface p-5 md:col-span-2">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-surface-sunken">
            <BoxesIcon className="size-5 text-muted-foreground" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Grasshopper 生成器</p>
            <p className="text-xs text-muted-foreground">你的账号没有开通 GH 生成器，需要时请联系管理员</p>
          </div>
          <Badge variant="outline">未开通</Badge>
        </div>
      </section>
    )
  }
  return <GhGeneratorPanel />
}

function GhGeneratorPanel() {
  const [text, setText] = useState("")
  const [items, setItems] = useState<GhRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const apply = useCallback((res: ListResult) => {
    if ("error" in res) setError(res.error)
    else {
      setError(null)
      setItems(res.requests)
    }
  }, [])
  const load = useCallback(async () => apply(await fetchList()), [apply])

  // 进来读一次；有单在排队或生成中时每 10 秒刷新一次，都结束了就停
  const open = items?.some((i) => i.status === "pending" || i.status === "claimed")
  useEffect(() => {
    let alive = true
    const tick = () => fetchList().then((res) => alive && apply(res))
    if (items === null) tick()
    const t = open ? setInterval(tick, 10_000) : undefined
    return () => {
      alive = false
      if (t) clearInterval(t)
    }
  }, [open, items, apply])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    const r = await fetch("/api/gh/requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    }).catch(() => null)
    const body = r ? await r.json().catch(() => null) : null
    setSending(false)
    if (!r || !r.ok) {
      setError(body?.error === "already 3 requests in progress" || r?.status === 429 ? "你已经有 3 单在排队或生成中，等其中一单完成再交" : (body?.error ?? "没有交上去，请再试一次"))
      return
    }
    setText("")
    await load()
  }

  return (
    <section aria-label="Grasshopper 生成器" className="rounded-xl border bg-surface p-5 md:col-span-2">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-surface-sunken">
          <BoxesIcon className="size-5 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Grasshopper 生成器</p>
          <p className="text-xs text-muted-foreground">用中文描述想要的电池组，约 5–10 分钟拿回 .gh、.3dm 和两张图（连线图 · 透视图）</p>
        </div>
        <Badge variant="primary">可用</Badge>
      </div>

      <form onSubmit={submit} className="mt-4 space-y-2">
        <textarea
          rows={3}
          value={text}
          maxLength={4000}
          onChange={(e) => setText(e.target.value)}
          placeholder="例如：一排竖向遮阳百叶，20 片，间距 600，高 3000，截面 50×200，沿一条曲线排布"
          aria-label="需求描述"
          className="block w-full resize-y rounded-md border border-input bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-ring"
        />
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={!text.trim() || sending}>
            {sending && <LoaderIcon className="animate-spin" />}
            生成
          </Button>
          <p className="text-xs text-muted-foreground">一次只跑一单，前面有人时会排队。生成记录跟着你的账号，暂时不会自动存进项目文件夹。结果是参考，是否可用由你判断。</p>
        </div>
      </form>

      {error && (
        <p role="alert" className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlertIcon className="size-4" />
          {error}
        </p>
      )}

      <p className="mt-5 text-xs font-medium text-muted-foreground">我的生成记录</p>
      {items === null && !error && <p className="mt-2 text-sm text-muted-foreground">读取中…</p>}
      {items?.length === 0 && <p className="mt-2 text-sm text-muted-foreground">还没有生成过</p>}
      <ul className="mt-2 space-y-3">
        {items?.map((r) => (
          <GhRequestItem key={r.id} r={r} />
        ))}
      </ul>
    </section>
  )
}

/** 一单生成记录（四种状态：排队中 · 生成中 · 已完成 · 没有成功；/design 样张页也用它）。
 *  fileUrl 可换掉：样张页不连后端 */
export function GhRequestItem({ r, fileUrl = file }: { r: GhRequest; fileUrl?: (id: string, name: string) => string }) {
  return (
    <li data-gh-id={r.id} data-gh-status={r.status} className="rounded-lg border p-3">
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-sm whitespace-pre-wrap">{r.text}</p>
        <Badge variant={r.status === "done" ? "primary" : "outline"}>
          {(r.status === "pending" || r.status === "claimed") && <LoaderIcon className="animate-spin" />}
          {STATUS[r.status]}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        {r.created_at.slice(0, 16).replace("T", " ")} 提交{r.finished_at && ` · ${r.finished_at.slice(0, 16).replace("T", " ")} 完成`}
      </p>
      {r.status === "failed" && r.error && <p className="mt-2 text-sm text-destructive">{r.error}</p>}
      {r.status === "done" && (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {r.files
              .filter((f) => f.endsWith(".png"))
              .map((f) => (
                <a key={f} href={fileUrl(r.id, f)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border bg-surface-sunken">
                  {/* eslint-disable-next-line @next/next/no-img-element -- 鉴权后的动态图，不走 next/image 优化 */}
                  <img src={fileUrl(r.id, f)} alt={f.endsWith("-canvas.png") ? "电池组连线图" : "Rhino 透视图"} className="aspect-video w-full object-contain" />
                  <span className="block px-2 py-1 text-xs text-muted-foreground">{f.endsWith("-canvas.png") ? "电池组连线图" : "Rhino 透视图"}</span>
                </a>
              ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {r.files
              .filter((f) => !f.endsWith(".png"))
              .map((f) => (
                <Button key={f} asChild variant="outline" size="sm">
                  <a href={fileUrl(r.id, f)} download={f}>
                    <DownloadIcon />
                    {f.endsWith(".gh") ? "下载 .gh" : "下载 .3dm"}
                  </a>
                </Button>
              ))}
            {r.model_confirmed === true && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2Icon className="size-3.5" />
                生成后模型对照过需求
              </span>
            )}
            {r.model_confirmed === false && <span className="text-xs text-muted-foreground">生成后模型认为与需求可能有出入，请核对</span>}
          </div>
          {r.assumptions.length > 0 && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-xs text-muted-foreground">生成时做的假设（{r.assumptions.length}）</summary>
              <ul className="mt-1 space-y-0.5">
                {r.assumptions.map((a) => (
                  <li key={a}>· {a}</li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </li>
  )
}
