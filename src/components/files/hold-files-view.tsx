"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronRightIcon, DownloadIcon, FileIcon, FolderIcon, HardDriveIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

interface Entry {
  name: string
  dir: boolean
  size: number | null
  mtime: number
}

const ROOT = "/tank"

/**
 * 管理员的「我的文件」= hold 上的全部文件（owner 2026-09-26「在管理员的我的文件里面，可以看到所有的文件夹。
 * 整理好的规范图集等，我自己的下载到服务器上的文件。 别人的文件 等。」）。
 * 只读：能逐层进入、在浏览器里打开、下载；不能改、不能删。每次打开文件都记入查看记录。
 */
const GROUPS: { title: string; hint: string; names: string[] }[] = [
  { title: "整理好的资料", hint: "规范 · 图集 · 杂志 · 媒体与语料 · 识别产物", names: ["library", "architecture-magazines", "corpus", "cairn-archive", "derived"] },
  { title: "我的下载", hint: "下载到服务器上的文件（百度网盘等）", names: ["inbox", "baidu"] },
  { title: "成员的文件", hint: "每人一个文件夹（百度导入按人落在这里）", names: ["people"] },
]

export function HoldFilesView() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const path = params.get("path") || ROOT
  // asked = 这一次请求的路径；hold 回的 path 是解析过软链的真实路径，可能和网址里的不同，不能拿它判「读回来没有」
  const [data, setData] = useState<{ asked: string; path: string; entries: Entry[]; total: number; error?: string }>()

  useEffect(() => {
    let alive = true
    fetch(`/api/admin/hold-fs/list?${new URLSearchParams({ path })}`)
      .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => alive && setData(ok ? { ...body, asked: path } : { asked: path, path, entries: [], total: 0, error: body.error ?? "读不出这个文件夹" }))
      .catch(() => alive && setData({ asked: path, path, entries: [], total: 0, error: "hold 连不上" }))
    return () => {
      alive = false
    }
  }, [path])

  const go = (p: string) => router.push(p === ROOT ? pathname : `${pathname}?${new URLSearchParams({ path: p })}`)
  const loading = !data || data.asked !== path
  const crumbs = path.split("/").filter(Boolean)
  const fileUrl = (name: string, download = false) =>
    `/api/admin/hold-fs/file?${new URLSearchParams({ path: `${path}/${name}`, ...(download ? { download: "1" } : {}) })}`

  const atRoot = path === ROOT
  const byName = new Map((data?.entries ?? []).map((e) => [e.name, e]))
  const grouped = new Set(GROUPS.flatMap((g) => g.names))
  const rest = (data?.entries ?? []).filter((e) => e.dir && !grouped.has(e.name))

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <HardDriveIcon className="size-6 text-muted-foreground" />
          我的文件 · hold
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">服务器上的全部文件夹。只读：可以打开、下载，不能改动或删除；每次打开文件都会记入查看记录。</p>

        <nav aria-label="位置" className="mt-5 flex flex-wrap items-center gap-1 text-sm">
          {crumbs.map((c, i) => {
            const p = "/" + crumbs.slice(0, i + 1).join("/")
            const last = i === crumbs.length - 1
            return (
              <span key={p} className="flex items-center gap-1">
                {i > 0 && <ChevronRightIcon className="size-3.5 text-muted-foreground" />}
                {last ? (
                  <span className="font-medium">{c}</span>
                ) : (
                  <button type="button" onClick={() => go(p)} className="cursor-pointer text-muted-foreground hover:text-foreground">
                    {c}
                  </button>
                )}
              </span>
            )
          })}
        </nav>

        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">正在读取…</p>
        ) : data.error ? (
          <p role="alert" className="py-16 text-center text-sm text-destructive">{data.error}</p>
        ) : atRoot ? (
          <div className="mt-6 space-y-8">
            {GROUPS.map((g) => (
              <section key={g.title} aria-label={g.title}>
                <h2 className="text-sm font-medium">{g.title}</h2>
                <p className="text-xs text-muted-foreground">{g.hint}</p>
                <ul className="mt-2 divide-y rounded-lg border">
                  {g.names.map((n) => byName.get(n)).filter((e): e is Entry => Boolean(e)).map((e) => (
                    <Row key={e.name} e={e} onOpen={() => go(`${path}/${e.name}`)} />
                  ))}
                </ul>
              </section>
            ))}
            {rest.length > 0 && (
              <section aria-label="系统与备份">
                <h2 className="text-sm font-medium">系统与备份</h2>
                <p className="text-xs text-muted-foreground">产线状态、缓存、备份等</p>
                <ul className="mt-2 divide-y rounded-lg border">
                  {rest.map((e) => (
                    <Row key={e.name} e={e} onOpen={() => go(`${path}/${e.name}`)} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : (
          <>
            <p className="mt-4 text-xs text-muted-foreground tabular-nums">
              共 {data.total} 项{data.total > data.entries.length && `，只显示前 ${data.entries.length} 项`}
            </p>
            {data.entries.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">这个文件夹是空的</p>
            ) : (
              <ul className="mt-2 divide-y rounded-lg border">
                {data.entries.map((e) =>
                  e.dir ? (
                    <Row key={e.name} e={e} onOpen={() => go(`${path}/${e.name}`)} />
                  ) : (
                    <Row key={e.name} e={e} href={fileUrl(e.name)} download={fileUrl(e.name, true)} />
                  ),
                )}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Row({ e, onOpen, href, download }: { e: Entry; onOpen?: () => void; href?: string; download?: string }) {
  const Icon = e.dir ? FolderIcon : FileIcon
  const label = (
    <>
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-left">{e.name}</span>
      <span className="hidden w-24 text-right text-xs text-muted-foreground tabular-nums sm:inline">{e.dir ? "" : size(e.size)}</span>
      <span className="hidden w-28 text-right text-xs text-muted-foreground tabular-nums sm:inline">{new Date(e.mtime * 1000).toLocaleDateString("zh-CN")}</span>
    </>
  )
  return (
    <li data-hold-entry={e.name} className="flex items-center gap-2 px-3">
      {e.dir ? (
        <button type="button" onClick={onOpen} className="flex h-10 flex-1 cursor-pointer items-center gap-3 text-sm hover:text-primary">
          {label}
        </button>
      ) : (
        <>
          <a href={href} target="_blank" rel="noreferrer" className="flex h-10 min-w-0 flex-1 items-center gap-3 text-sm hover:text-primary">
            {label}
          </a>
          <Button asChild variant="ghost" size="icon-sm" aria-label={`下载 ${e.name}`}>
            <a href={download}>
              <DownloadIcon />
            </a>
          </Button>
        </>
      )}
    </li>
  )
}

function size(n: number | null) {
  if (n == null) return ""
  const u = ["B", "KB", "MB", "GB", "TB"]
  let i = 0
  let v = n
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024
    i++
  }
  return `${v < 10 && i ? v.toFixed(1) : Math.round(v)} ${u[i]}`
}
