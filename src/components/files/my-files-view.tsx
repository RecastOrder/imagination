"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CloudIcon, FolderIcon, LinkIcon, Loader2Icon, UnplugIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Meter } from "@/components/ui/meter"
import { toast } from "@/components/ui/toast"
import { HoldBrowser, MoveDialog } from "./hold-browser"

interface Conn {
  kind: string
  name: string
  connected_at: string | null
}
interface Usage {
  used: number
  quota: number | null
}

/** 能连的网盘。OneDrive / 坚果云 / 群晖 NAS 是下一段（spec 108 §6），先摆出来说清「还没接」，不假装能点 */
const DRIVES: { kind: string; label: string; ready: boolean; hint: string }[] = [
  { kind: "baidu", label: "百度网盘", ready: true, hint: "用百度网盘 App 扫码连接" },
  { kind: "onedrive", label: "OneDrive", ready: false, hint: "下一段接入" },
  { kind: "jianguoyun", label: "坚果云", ready: false, hint: "下一段接入（WebDAV）" },
  { kind: "nas", label: "群晖 NAS", ready: false, hint: "下一段接入（WebDAV）" },
]

const size = (n: number) => {
  for (const [u, k] of [["GB", 1 << 30], ["MB", 1 << 20], ["KB", 1 << 10]] as const) if (n >= k) return `${(n / k).toFixed(1)} ${u}`
  return `${n} B`
}

/**
 * 我的文件 = 服务器上属于自己的那个文件夹 + 自己连上的网盘（owner 2026-09-26「每个成员可以管理自己的文件夹」；
 * 2026-09-27「网页不在大陆 提供链接配置，连接之后就是实时挂载的网盘 如果想导入到服务器可以选择文件并保存到服务器
 * 网盘自己配置。 每个人的服务器空间按照50GB为限额先。」）
 * - 首页：用量（上限 50 GB）· 网盘栏 · 大拖拽上传区 · 文件列表（已连接的网盘排在最前面，像一个文件夹）
 * - ?drive=baidu：实时浏览百度网盘（不先拷贝）；勾选文件 ⇒ 保存到服务器（选存在自己文件夹的哪一层）
 */
export function MyFilesView({ home }: { home: string }) {
  const drive = useSearchParams().get("drive")
  const [conns, setConns] = useState<Conn[] | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [qr, setQr] = useState(false)
  const [saving, setSaving] = useState<string[] | null>(null)
  const [jobNote, setJobNote] = useState<string | null>(null)

  const loadConns = useCallback(() => {
    fetch("/api/drives")
      .then((r) => (r.ok ? r.json() : { connections: [] }))
      .then((b) => setConns(b.connections ?? []))
      .catch(() => setConns([]))
  }, [])
  const loadUsage = useCallback(() => {
    fetch("/api/files/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => b && setUsage(b))
      .catch(() => {})
  }, [])
  useEffect(() => {
    loadConns()
    loadUsage()
  }, [loadConns, loadUsage])

  const baidu = conns?.find((c) => c.kind === "baidu")

  // 保存到服务器：交给 hold 后台拷，这里每 2 秒问一次进度，拷完报一句、刷新用量
  const startImport = async (paths: string[], dest: string) => {
    const r = await fetch("/api/drives/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "baidu", paths, dest }) })
    const b = await r.json().catch(() => ({}))
    if (!r.ok) {
      toast(`没保存成：${b.error ?? r.status}`)
      return
    }
    setJobNote(`正在保存 ${paths.length} 个文件到服务器…`)
    // 最多等 2 小时；任务在 hold 上不见了（比如 hold 重启过）连续 30 次问不到 ⇒ 明说看不到进度，不无限转圈
    for (let tries = 0, missing = 0; tries < 3600; tries++) {
      await new Promise((ok) => setTimeout(ok, 2000))
      const j = await fetch("/api/drives/jobs").then((x) => x.json()).catch(() => null)
      const job = j?.jobs?.find((x: { id: string }) => x.id === b.job)
      if (!job) {
        if (++missing >= 30) break
        continue
      }
      missing = 0
      const done = job.items.filter((i: { state: string }) => i.state === "done").length
      const bad = job.items.filter((i: { state: string }) => i.state === "error")
      setJobNote(`正在保存：${done + bad.length}/${job.items.length}`)
      if (job.status === "done") {
        setJobNote(null)
        loadUsage()
        toast(bad.length ? `保存了 ${done} 个，${bad.length} 个没成：${bad[0].error}` : `已保存 ${done} 个文件到服务器`, { href: `/files?path=${encodeURIComponent(dest)}`, linkLabel: "去看看" })
        return
      }
    }
    setJobNote(null)
    loadUsage()
    toast("看不到这次保存的进度了（服务器可能重启过）—— 去「我的文件」看看哪些已经到了", { href: `/files?path=${encodeURIComponent(dest)}`, linkLabel: "去看看" })
  }

  if (drive === "baidu") {
    return (
      <>
        <HoldBrowser
          key="baidu"
          api="/api/drives/baidu"
          root="/"
          rootLabel="百度网盘"
          idPrefix="drive:baidu:"
          parentCrumb={{ label: "我的文件", href: "/files" }}
          title={
            <>
              <CloudIcon className="size-6 text-primary" />
              百度网盘{baidu?.name ? ` · ${baidu.name}` : ""}
            </>
          }
          subtitle="实时挂载：看到的就是你百度网盘里此刻的样子，打开时现场去百度读，不会先拷到服务器。想留一份在服务器上：勾选文件，点「保存到服务器」。"
          topSlot={jobNote && <p data-import-note className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2Icon className="size-4 animate-spin" />{jobNote}</p>}
          select={{
            label: "保存到服务器",
            run: (paths) => {
              setSaving(paths)
              return false // 先不清空勾选：选存放位置时点了取消，勾好的还在
            },
          }}
        />
        {saving && (
          <MoveDialog
            api="/api/files"
            name=""
            title={`把选中的 ${saving.length} 个文件保存到…`}
            confirmLabel="保存到这里"
            allowStart
            start={home}
            roots={[home]}
            onCancel={() => setSaving(null)}
            onSubmit={(dest) => {
              const p = saving
              setSaving(null)
              void startImport(p, dest)
            }}
          />
        )}
      </>
    )
  }

  const top = (
    <div className="mt-4 space-y-4">
      {usage && usage.quota ? (
        <div data-usage className="max-w-md">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>服务器空间</span>
            <span>
              已用 {size(usage.used)} / {size(usage.quota)} · 还剩 {size(Math.max(0, usage.quota - usage.used))}
            </span>
          </div>
          <Meter value={usage.used} max={usage.quota} label="服务器空间用量" />
        </div>
      ) : null}
      <section aria-label="网盘" data-drive-bar>
        <p className="mb-2 text-sm font-medium">网盘</p>
        <div className="flex flex-wrap gap-2">
          {DRIVES.map((d) => {
            const c = conns?.find((x) => x.kind === d.kind)
            return (
              <div key={d.kind} data-drive={d.kind} className="flex items-center gap-2 rounded-lg border bg-surface px-3 py-2 text-sm">
                <CloudIcon className={c ? "size-4 text-primary" : "size-4 text-muted-foreground"} />
                <span className="font-medium">{d.label}</span>
                {c ? (
                  <>
                    <Badge variant="outline">已连接{c.name ? ` · ${c.name}` : ""}</Badge>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`断开${d.label}`}
                      title="断开（服务器上删掉你的登录态；网盘里的文件不受影响）"
                      onClick={async () => {
                        if (!confirm(`断开${d.label}？网盘里的文件不受影响，已保存到服务器的也不受影响。`)) return
                        await fetch(`/api/drives/${d.kind}/disconnect`, { method: "POST" })
                        loadConns()
                      }}
                    >
                      <UnplugIcon />
                    </Button>
                  </>
                ) : d.ready ? (
                  <Button size="sm" variant="outline" data-connect={d.kind} onClick={() => setQr(true)}>
                    <LinkIcon />
                    连接
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">{d.hint}</span>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )

  return (
    <>
      <HoldBrowser
        api="/api/files"
        root={home}
        rootLabel="我的文件"
        annotatable
        dropzone
        onChanged={loadUsage}
        topSlot={top}
        extraFolders={baidu ? [{ name: "百度网盘", label: "百度网盘", href: "/files?drive=baidu", hint: "实时 · 不占服务器空间" }] : []}
        title={
          <>
            <FolderIcon className="size-6 text-muted-foreground" />
            我的文件
          </>
        }
        subtitle="只有你自己能改这里的文件（管理员能看，但不能改）。点文件从右侧打开阅读；连上的网盘显示成文件夹，实时浏览。"
      />
      {qr && (
        <BaiduQrDialog
          onClose={() => setQr(false)}
          onConnected={() => {
            setQr(false)
            loadConns()
            toast("百度网盘已连接", { href: "/files?drive=baidu", linkLabel: "打开" })
          }}
        />
      )}
    </>
  )
}

/** 扫码连接百度网盘：二维码由 hold 从百度取回（网页不在大陆，不让浏览器直连百度）；手机扫码并确认后，登录态只存在 hold 上、加密 */
function BaiduQrDialog({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [qr, setQr] = useState<{ gid: string; img: string } | null>(null)
  const [state, setState] = useState<"loading" | "waiting" | "scanned" | "expired" | "error">("loading")
  const [err, setErr] = useState("")
  const [round, setRound] = useState(0)
  const alive = useRef(true)
  // 父组件每次重画都会给一个新的 onConnected —— 放进 ref，免得它一变就重新生成二维码（扫到一半码换了）
  const done = useRef(onConnected)
  useEffect(() => {
    done.current = onConnected
  }, [onConnected])

  useEffect(() => {
    alive.current = true
    ;(async () => {
      setState("loading")
      const r = await fetch("/api/drives/baidu/qr", { method: "POST" }).catch(() => null)
      const b = r ? await r.json().catch(() => ({})) : {}
      if (!alive.current) return
      if (!r?.ok) {
        setErr(b.error ?? "二维码取不到")
        setState("error")
        return
      }
      setQr(b)
      setState("waiting")
      // 百度那边一次最多挂四十秒；没结果就再问，直到连上 / 过期 / 关掉对话框
      for (;;) {
        const p = await fetch("/api/drives/baidu/poll", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ gid: b.gid }) })
          .then((x) => x.json())
          .catch(() => ({ status: "waiting" }))
        if (!alive.current) return
        if (p.status === "connected") return done.current()
        if (p.status === "expired") return setState("expired")
        if (p.status === "failed" || p.error) {
          setErr(p.error ?? "没连上")
          return setState("error")
        }
        setState(p.status === "scanned" ? "scanned" : "waiting")
        await new Promise((ok) => setTimeout(ok, 1500))
      }
    })()
    return () => {
      alive.current = false
    }
  }, [round])

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle>连接百度网盘</DialogTitle>
        <DialogDescription>用手机上的百度网盘 App 扫下面的二维码，并在手机上点「确认登录」。连上之后，你的百度网盘会出现在「我的文件」里，像一个文件夹。</DialogDescription>
        <div className="mt-3 flex flex-col items-center gap-3" data-baidu-qr={state}>
          {qr && state !== "expired" && state !== "error" ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URI，由 hold 取回
            <img src={qr.img} alt="百度网盘登录二维码" className="size-48 rounded-md border bg-white p-2" />
          ) : (
            <div className="flex size-48 items-center justify-center rounded-md border text-sm text-muted-foreground">
              {state === "loading" ? <Loader2Icon className="size-5 animate-spin" /> : state === "expired" ? "二维码过期了" : err}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {state === "waiting" && "等你扫码…"}
            {state === "scanned" && "已扫码，请在手机上点「确认登录」"}
            {state === "loading" && "正在取二维码…"}
          </p>
          {(state === "expired" || state === "error") && (
            <Button size="sm" onClick={() => setRound((n) => n + 1)}>
              重新生成二维码
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            说明：这里用的是扫码登录，不是百度开放平台的接口；你的登录态只存在我们自己的服务器上，加密存放，只用来替你读你自己的网盘。随时可以「断开」。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
