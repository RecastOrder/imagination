"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeftIcon,
  CloudIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileIcon,
  FolderIcon,
  FolderInputIcon,
  FolderPlusIcon,
  LockIcon,
  Maximize2Icon,
  Minimize2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react"

import { ViewerHost } from "@/components/drive/viewer-host"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

interface Entry {
  name: string
  dir: boolean
  size: number | null
  mtime: number
}
interface Listing {
  asked: string
  path: string
  entries: Entry[]
  total: number
  editable?: boolean
  trash?: boolean
  editRoot?: string | null
  error?: string
}
export interface BrowserGroup {
  title: string
  hint: string
  names: string[]
}

const TRASH = ".trash"
/** 一块 32 MB（服务端上限也是 32 MB）：线上前面有 Cloudflare，单个请求体有上限，大文件拆块传，断了接着传 */
const CHUNK = 32 << 20

/**
 * hold 上的文件浏览（owner 2026-09-26）。两个入口共用这一个组件：
 * - 「我的文件」：api=/api/files，root=自己的文件夹，整个都能改；
 * - 「存储总库」：api=/api/admin/hold-fs，root=/tank，只有 inbox / baidu 能改（服务端说了算：列目录时回 editable）。
 * 点文件 ⇒ 右侧抽屉打开（?file=完整路径），抽屉可以全屏（?full=1）；网址里带着，后退键就能关。
 */
export function HoldBrowser({
  api,
  root,
  rootLabel,
  title,
  subtitle,
  groups,
  annotatable,
  topSlot,
  extraFolders,
  parentCrumb,
  select,
  dropzone,
  onChanged,
  idPrefix = "hold:",
}: {
  api: string
  root: string
  rootLabel: string
  title: React.ReactNode
  subtitle: React.ReactNode
  /** 只在根目录用：把文件夹分组显示（存储总库） */
  groups?: BrowserGroup[]
  /** 可编辑区里的 PDF 能不能做自己的标注（服务端 fileAccess 也会判） */
  annotatable?: boolean
  /** 标题下面插的东西（我的文件：用量 + 网盘栏） */
  topSlot?: React.ReactNode
  /** 根目录最上面多出来的文件夹（已连接的网盘），点了去 href */
  extraFolders?: { name: string; label: string; href: string; hint?: string }[]
  /** 面包屑最前面再加一级（在网盘里时：「我的文件」） */
  parentCrumb?: { label: string; href: string }
  /** 文件可以勾选，勾了之后出现一个按钮（网盘里：「保存到服务器」） */
  select?: { label: string; run: (paths: string[]) => Promise<boolean> | boolean }
  /** 可编辑时在列表上方放一块大的拖拽上传区 */
  dropzone?: boolean
  /** 上传或改动完成（用量要跟着刷新） */
  onChanged?: () => void
  /** 阅读器里文件的编号前缀（个人标注按它存）：服务器上的 hold: · 网盘里的 drive:baidu: */
  idPrefix?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const path = params.get("path") || root
  const openFile = params.get("file")
  const full = params.get("full") === "1"
  const [data, setData] = useState<Listing>()
  const [more, setMore] = useState(false)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => {
    setTick((t) => t + 1)
    onChanged?.()
  }, [onChanged])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  // 根是 "/"（网盘）时拼路径不能拼出 "//名字"
  const join = (a: string, b: string) => (a === "/" ? `/${b}` : `${a}/${b}`)

  const nav = useCallback(
    (patch: Record<string, string | null>, replace = false) => {
      const next = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) next.delete(k)
        else next.set(k, v)
      }
      const s = next.toString()
      const url = s ? `${pathname}?${s}` : pathname
      if (replace) router.replace(url, { scroll: false })
      else router.push(url, { scroll: false })
    },
    [params, pathname, router],
  )

  useEffect(() => {
    let alive = true
    fetch(`${api}/list?${new URLSearchParams({ path })}`)
      .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => alive && setData(ok ? { ...body, asked: path } : { asked: path, path, entries: [], total: 0, error: body.error ?? "读不出这个文件夹" }))
      .catch(() => alive && setData({ asked: path, path, entries: [], total: 0, error: "文件服务连不上" }))
    return () => {
      alive = false
    }
  }, [api, path, tick])

  // 一页 500 项；大文件夹点「再显示 500 项」往下翻
  const loadMore = async () => {
    if (!data || more) return
    setMore(true)
    const r = await fetch(`${api}/list?${new URLSearchParams({ path, offset: String(data.entries.length) })}`).catch(() => null)
    const body = r?.ok ? await r.json().catch(() => null) : null
    setMore(false)
    if (body?.entries && data.asked === path) setData({ ...data, entries: [...data.entries, ...body.entries] })
  }

  const go = (p: string) => nav({ path: p === root ? null : p, file: null, full: null })
  const fileUrl = (p: string, download = false) => `${api}/file?${new URLSearchParams({ path: p, ...(download ? { download: "1" } : {}) })}`
  const loading = !data || data.asked !== path
  const editable = !!data?.editable && !loading
  const inTrash = !!data?.trash && !loading
  const atRoot = path === root

  // 面包屑：root 以上的部分收成一个名字（「我的文件」/「tank」）
  const rel = path === root ? [] : path.slice(root === "/" ? 1 : root.length + 1).split("/")
  const crumbs = [{ label: rootLabel, p: root }, ...rel.map((c, i) => ({ label: c === TRASH ? "回收站" : c, p: join(root, rel.slice(0, i + 1).join("/")) }))]

  const [dialog, setDialog] = useState<null | { kind: "mkdir" } | { kind: "rename"; e: Entry } | { kind: "move"; e: Entry }>(null)
  const uploader = useChunkUploader(api, reload)
  const inputRef = useRef<HTMLInputElement>(null)

  const act = async (op: string, body: Record<string, string>, ok: string) => {
    const r = await fetch(`${api}/edit/${op}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null)
    const res = r ? await r.json().catch(() => ({})) : { error: "连不上" }
    if (!r?.ok) {
      toast(`没做成：${res.error ?? r?.status}`)
      return false
    }
    toast(ok)
    reload()
    return true
  }

  const byName = new Map((data?.entries ?? []).map((e) => [e.name, e]))
  const grouped = new Set((groups ?? []).flatMap((g) => g.names))
  const rest = (data?.entries ?? []).filter((e) => e.dir && !grouped.has(e.name))
  // 可编辑区里：回收站排最前，其余点开头的（工具自己的状态文件）不列 —— 它们不许动，列出来只会让人以为能动
  const shown = (data?.entries ?? [])
    .filter((e) => !(editable || inTrash) || e.name === TRASH || !e.name.startsWith("."))
    .sort((a, b) => (a.name === TRASH ? -1 : b.name === TRASH ? 1 : 0))

  const rowProps = (e: Entry) => {
    const full = join(path, e.name)
    return {
      e,
      label: e.name === TRASH ? "回收站" : e.name,
      active: openFile === full,
      onOpen: () => (e.dir ? go(full) : nav({ file: full }, !!openFile)),
      download: e.dir ? undefined : fileUrl(full, true),
      picked: select && !e.dir ? picked.has(full) : undefined,
      onPick: select && !e.dir ? () => setPicked((s) => { const n = new Set(s); if (n.has(full)) n.delete(full); else n.add(full); return n }) : undefined,
      actions:
        editable && e.name !== TRASH && !e.name.startsWith(".")
          ? [
              { label: "改名", icon: PencilIcon, run: () => setDialog({ kind: "rename", e }) },
              { label: "移动到…", icon: FolderInputIcon, run: () => setDialog({ kind: "move", e }) },
              { label: "移到回收站", icon: Trash2Icon, run: () => act("trash", { path: full }, `已移到回收站：${e.name}`) },
            ]
          : inTrash && path.split("/").length - (data?.editRoot ?? root).split("/").length === 2
            ? [{ label: "放回原处", icon: RotateCcwIcon, run: () => act("restore", { path: full }, `已放回：${e.name}`) }]
            : undefined,
    }
  }

  const list = (
    <div
      className="h-full overflow-y-auto"
      onDragOver={(e) => editable && e.dataTransfer.types.includes("Files") && e.preventDefault()}
      onDrop={(e) => {
        if (!editable || !e.dataTransfer.files.length) return
        e.preventDefault()
        uploader.add(path, Array.from(e.dataTransfer.files))
      }}
    >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        {topSlot}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <nav aria-label="位置" className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-sm">
            {parentCrumb && (
              <span className="flex items-center gap-1">
                <button type="button" onClick={() => router.push(parentCrumb.href)} className="cursor-pointer text-muted-foreground hover:text-foreground">
                  {parentCrumb.label}
                </button>
                <ChevronRightIcon className="size-3.5 text-muted-foreground" />
              </span>
            )}
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1
              return (
                <span key={c.p} className="flex items-center gap-1">
                  {i > 0 && <ChevronRightIcon className="size-3.5 text-muted-foreground" />}
                  {last ? (
                    <span className="font-medium">{c.label}</span>
                  ) : (
                    <button type="button" onClick={() => go(c.p)} className="cursor-pointer text-muted-foreground hover:text-foreground">
                      {c.label}
                    </button>
                  )}
                </span>
              )
            })}
          </nav>
          {!loading && !data.error && (editable ? (
            <>
              <Badge variant="outline">可以修改</Badge>
              <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "mkdir" })}>
                <FolderPlusIcon />
                新建文件夹
              </Button>
              <Button size="sm" data-upload-button onClick={() => inputRef.current?.click()}>
                <UploadCloudIcon />
                上传
              </Button>
              <input
                ref={inputRef}
                type="file"
                multiple
                hidden
                data-upload-input
                onChange={(e) => {
                  if (e.target.files?.length) uploader.add(path, Array.from(e.target.files))
                  e.target.value = ""
                }}
              />
            </>
          ) : inTrash ? (
            <Badge variant="outline">回收站 · 放回请点每一项右边的「…」</Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <LockIcon className="size-3" />
              只读
            </Badge>
          ))}
        </div>

        {select && picked.size > 0 && (
          <div data-select-bar className="mt-4 flex items-center gap-3 rounded-lg border bg-primary-subtle px-3 py-2 text-sm">
            <span>已选 {picked.size} 个文件</span>
            <Button
              size="sm"
              data-select-run
              onClick={async () => {
                if (await select.run([...picked])) setPicked(new Set())
              }}
            >
              {select.label}
            </Button>
            <button type="button" onClick={() => setPicked(new Set())} className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              取消选择
            </button>
          </div>
        )}
        {dropzone && editable && (
          <button
            type="button"
            data-dropzone
            onClick={() => inputRef.current?.click()}
            className="mt-4 flex w-full cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-border-strong bg-surface px-6 py-8 text-center hover:border-primary"
          >
            <UploadCloudIcon className="size-7 text-muted-foreground" />
            <span className="font-medium">拖拽文件到这里，或点击选择</span>
            <span className="text-xs text-muted-foreground">大文件分块传，断了能接着传 · 传完在服务器上算一次指纹（SHA-256）· 重名自动编号，不会覆盖</span>
          </button>
        )}
        <UploadList items={uploader.items} onClear={uploader.clearDone} />

        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">正在读取…</p>
        ) : data.error ? (
          <p role="alert" className="py-16 text-center text-sm text-destructive">{data.error}</p>
        ) : atRoot && groups ? (
          <div className="mt-6 space-y-8">
            {groups.map((g) => (
              <section key={g.title} aria-label={g.title}>
                <h2 className="text-sm font-medium">{g.title}</h2>
                <p className="text-xs text-muted-foreground">{g.hint}</p>
                <ul className="mt-2 divide-y rounded-lg border">
                  {g.names.map((n) => byName.get(n)).filter((e): e is Entry => Boolean(e)).map((e) => (
                    <Row key={e.name} {...rowProps(e)} />
                  ))}
                </ul>
              </section>
            ))}
            {rest.length > 0 && (
              <section aria-label="系统与备份">
                <h2 className="text-sm font-medium">系统与备份</h2>
                <p className="text-xs text-muted-foreground">产线状态、缓存、备份等 · 只读</p>
                <ul className="mt-2 divide-y rounded-lg border">
                  {rest.map((e) => (
                    <Row key={e.name} {...rowProps(e)} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : (
          <>
            <p className="mt-4 text-xs text-muted-foreground tabular-nums">
              共 {shown.length} 项{data.total > data.entries.length && `（文件夹里共 ${data.total} 项，已显示 ${data.entries.length} 项）`}
            </p>
            {atRoot && extraFolders && extraFolders.length > 0 && (
              <ul className="mt-2 divide-y rounded-lg border" aria-label="已连接的网盘">
                {extraFolders.map((f) => (
                  <li key={f.name} data-hold-entry={f.name} data-drive-folder className="flex items-center gap-2 px-3">
                    <button type="button" onClick={() => router.push(f.href)} className="flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-3 text-left text-sm hover:text-primary">
                      <CloudIcon className="size-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate">{f.label}</span>
                      {f.hint && <span className="text-xs text-muted-foreground">{f.hint}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {shown.length === 0 ? (
              <div className="mt-2 rounded-lg border border-dashed px-6 py-14 text-center text-sm text-muted-foreground">
                {editable ? "这里还是空的。点右上角「上传」，或者把文件拖进这个窗口。" : "这个文件夹是空的"}
              </div>
            ) : (
              <ul className="mt-2 divide-y rounded-lg border">
                {shown.map((e) => (
                  <Row key={e.name} {...rowProps(e)} />
                ))}
              </ul>
            )}
            {data.total > data.entries.length && (
              <div className="mt-3 text-center">
                <Button variant="outline" size="sm" disabled={more} onClick={loadMore}>
                  {more ? "正在读取…" : `再显示 ${Math.min(500, data.total - data.entries.length)} 项`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-full min-h-0">
      <div className={cn("min-w-0 flex-1", openFile && "max-lg:hidden")}>{list}</div>
      {openFile && (
        <FilePanel
          key={openFile}
          path={openFile}
          url={fileUrl(openFile)}
          download={fileUrl(openFile, true)}
          full={full}
          id={`${idPrefix}${openFile}`}
          readOnly={!(annotatable && editableFor(openFile, data))}
          onFull={(v) => nav({ full: v ? "1" : null }, true)}
          onClose={() => nav({ file: null, full: null }, true)}
        />
      )}
      {dialog?.kind === "mkdir" && (
        <NameDialog
          title="新建文件夹"
          initial=""
          onCancel={() => setDialog(null)}
          onSubmit={(name) => act("mkdir", { dir: path, name }, `已新建文件夹：${name}`).then((ok) => ok && setDialog(null))}
        />
      )}
      {dialog?.kind === "rename" && (
        <NameDialog
          title={`改名：${dialog.e.name}`}
          initial={dialog.e.name}
          onCancel={() => setDialog(null)}
          onSubmit={(name) => act("rename", { path: `${path}/${dialog.e.name}`, name }, `已改名为：${name}`).then((ok) => ok && setDialog(null))}
        />
      )}
      {dialog?.kind === "move" && (
        <MoveDialog
          api={api}
          name={dialog.e.name}
          start={path}
          roots={data?.editRoot && data.editRoot !== root && path.startsWith("/tank/") && !path.startsWith("/tank/people/") ? ["/tank/inbox", "/tank/baidu"] : [data?.editRoot ?? root]}
          onCancel={() => setDialog(null)}
          onSubmit={(dest) => act("move", { path: `${path}/${dialog.e.name}`, dest }, `已移到：${dest}`).then((ok) => ok && setDialog(null))}
        />
      )}
    </div>
  )
}

/** 打开的文件所在的文件夹能不能改：就是当前列出来的这个文件夹（文件只能从当前文件夹点开） */
function editableFor(file: string, data?: Listing) {
  return !!data?.editable && file.slice(0, file.lastIndexOf("/")) === data.path
}

function Row({
  e,
  label,
  active,
  onOpen,
  download,
  actions,
  picked,
  onPick,
}: {
  e: Entry
  label: string
  active: boolean
  onOpen: () => void
  download?: string
  actions?: { label: string; icon: typeof PencilIcon; run: () => void }[]
  picked?: boolean
  onPick?: () => void
}) {
  const Icon = e.name === TRASH ? Trash2Icon : e.dir ? FolderIcon : FileIcon
  const [menu, setMenu] = useState(false)
  return (
    <li data-hold-entry={e.name} className={cn("flex items-center gap-2 px-3", active && "bg-primary-subtle")}>
      {onPick && (
        <input type="checkbox" checked={!!picked} onChange={onPick} aria-label={`选择 ${e.name}`} data-pick className="size-4 shrink-0 cursor-pointer accent-primary" />
      )}
      <button type="button" onClick={onOpen} className="flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-3 text-left text-sm hover:text-primary">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="hidden w-20 text-right text-xs text-muted-foreground tabular-nums sm:inline">{e.dir ? "" : size(e.size)}</span>
        <span className="hidden w-24 text-right text-xs text-muted-foreground tabular-nums md:inline">{new Date(e.mtime * 1000).toLocaleDateString("zh-CN")}</span>
      </button>
      {download && (
        <Button asChild variant="ghost" size="icon-sm" aria-label={`下载 ${e.name}`}>
          <a href={download}>
            <DownloadIcon />
          </a>
        </Button>
      )}
      {actions && (
        <Popover open={menu} onOpenChange={setMenu}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`${e.name} 的更多操作`} data-row-menu>
              <MoreHorizontalIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-40 p-1">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => {
                  setMenu(false)
                  a.run()
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent [&_svg]:size-4 [&_svg]:text-muted-foreground"
              >
                <a.icon />
                {a.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      )}
    </li>
  )
}

/** 右侧抽屉：按文件类型选查看器（PDF · Office · 图片 · 文本 · 音视频 · 3D），可以全屏 */
function FilePanel({
  id,
  path,
  url,
  download,
  full,
  readOnly,
  onFull,
  onClose,
}: {
  id: string
  path: string
  url: string
  download: string
  full: boolean
  readOnly: boolean
  onFull: (v: boolean) => void
  onClose: () => void
}) {
  const name = path.split("/").pop() || "文件"
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return
      if (full) onFull(false)
      else onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [full, onFull, onClose])
  return (
    <aside
      aria-label="文件预览"
      data-file-panel
      data-full={full ? "1" : undefined}
      className={cn(
        "flex min-h-0 flex-col bg-background",
        full ? "fixed inset-0 z-50" : "w-full border-l lg:w-[52%] lg:min-w-[420px] lg:max-w-[60%]",
      )}
    >
      <header className="flex items-center gap-1 border-b px-3 py-2">
        <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={onClose} aria-label="返回列表">
          <ArrowLeftIcon />
        </Button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium" title={path}>
          {name}
        </p>
        <Button asChild variant="ghost" size="icon-sm">
          <a href={download} aria-label="下载" title="下载到本机">
            <DownloadIcon />
          </a>
        </Button>
        <Button variant="ghost" size="icon-sm" data-full-toggle onClick={() => onFull(!full)} aria-label={full ? "退出全屏" : "全屏"} title={full ? "退出全屏（Esc）" : "全屏浏览"}>
          {full ? <Minimize2Icon /> : <Maximize2Icon />}
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="关闭" title="关闭（Esc）">
          <XIcon />
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        <ViewerHost file={{ type: "file", id, name, url }} readOnly={readOnly} download={download} printable />
      </div>
    </aside>
  )
}

function NameDialog({ title, initial, onCancel, onSubmit }: { title: string; initial: string; onCancel: () => void; onSubmit: (name: string) => void }) {
  const [v, setV] = useState(initial)
  const bad = !v.trim() || v.includes("/") || v.startsWith(".")
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>名字不能带 / ，也不能以 . 开头。</DialogDescription>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!bad) onSubmit(v.trim())
          }}
        >
          <Input autoFocus value={v} onChange={(e) => setV(e.target.value)} data-name-input />
          <Button type="submit" disabled={bad}>
            确定
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** 移动：在可以改的范围里逐层选一个文件夹，点「移到这里」（「保存到服务器」选存放位置也用它） */
export function MoveDialog({
  api,
  name,
  title,
  confirmLabel = "移到这里",
  allowStart = false,
  start,
  roots,
  onCancel,
  onSubmit,
}: {
  api: string
  name: string
  title?: string
  confirmLabel?: string
  /** 起点本身也能选（保存到服务器：默认就存在当前这一层） */
  allowStart?: boolean
  start: string
  roots: string[]
  onCancel: () => void
  onSubmit: (dest: string) => void
}) {
  const [at, setAt] = useState(start)
  const [dirs, setDirs] = useState<string[] | null>(null)
  useEffect(() => {
    let alive = true
    fetch(`${api}/list?${new URLSearchParams({ path: at })}`)
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((b) => alive && setDirs((b.entries as Entry[]).filter((e) => e.dir && !e.name.startsWith(".")).map((e) => e.name)))
      .catch(() => alive && setDirs([]))
    return () => {
      alive = false
    }
  }, [api, at])
  const root = roots.find((r) => at === r || at.startsWith(r + "/")) ?? roots[0]
  const up = at !== root ? at.slice(0, at.lastIndexOf("/")) : null
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogTitle>{title ?? `把「${name}」移到…`}</DialogTitle>
        <DialogDescription className="break-all">现在选中：{at}</DialogDescription>
        {roots.length > 1 && (
          <div className="mt-2 flex gap-1">
            {roots.map((r) => (
              <Button key={r} size="sm" variant={root === r ? "primary" : "outline"} onClick={() => (setDirs(null), setAt(r))}>
                {r.split("/").pop()}
              </Button>
            ))}
          </div>
        )}
        <ul className="mt-2 max-h-64 divide-y overflow-y-auto rounded-md border text-sm">
          {up && (
            <li>
              <button type="button" onClick={() => (setDirs(null), setAt(up))} className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-muted-foreground hover:bg-accent">
                <ArrowLeftIcon className="size-4" />
                上一级
              </button>
            </li>
          )}
          {dirs === null ? (
            <li className="px-3 py-2 text-muted-foreground">正在读取…</li>
          ) : dirs.length === 0 ? (
            <li className="px-3 py-2 text-muted-foreground">这一层没有子文件夹</li>
          ) : (
            dirs.map((d) => (
              <li key={d}>
                <button type="button" onClick={() => (setDirs(null), setAt(`${at}/${d}`))} className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left hover:bg-accent">
                  <FolderIcon className="size-4 text-muted-foreground" />
                  <span className="truncate">{d}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={() => onSubmit(at)} disabled={!allowStart && at === start} data-move-here>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface UploadItem {
  id: string
  name: string
  size: number
  sent: number
  status: "waiting" | "uploading" | "done" | "error"
  error?: string
  bps: number
}

/** 分块上传：一次一个文件、一块一块传；某一块失败先问 hold 收到了多少再接着传（最多重试 3 次），传完刷新列表 */
function useChunkUploader(api: string, onDone: () => void) {
  const [items, setItems] = useState<UploadItem[]>([])
  const queue = useRef<{ id: string; dir: string; file: File }[]>([])
  const running = useRef(false)
  const update = (id: string, patch: Partial<UploadItem>) => setItems((l) => l.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  const pump = useCallback(async () => {
    if (running.current) return
    running.current = true
    try {
      for (let job = queue.current.shift(); job; job = queue.current.shift()) {
        const { id, dir, file } = job
        const uid = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("")
        const base = { dir, name: file.name, uid, total: String(file.size) }
        let offset = 0
        let tries = 0
        const t0 = performance.now()
        update(id, { status: "uploading" })
        try {
          do {
            const end = Math.min(file.size, offset + CHUNK)
            const r = await fetch(`${api}/upload?${new URLSearchParams({ ...base, offset: String(offset) })}`, { method: "PUT", body: file.slice(offset, end) }).catch(() => null)
            const b = r ? await r.json().catch(() => ({})) : {}
            if (r?.ok) {
              offset = b.received ?? end
              tries = 0
              update(id, { sent: offset, bps: offset / Math.max(0.2, (performance.now() - t0) / 1000) })
              if (b.done) break
              continue
            }
            if (r && r.status < 500 && r.status !== 409) throw new Error(b.error ?? `上传失败（${r.status}）`)
            if (++tries > 3) throw new Error(b.error ?? "网络断了，重试 3 次没传上去")
            // 对不上 / 网络断：问 hold 已经收到多少，从那里接着传
            const s = await fetch(`${api}/upload?${new URLSearchParams({ dir, uid })}`).then((x) => x.json()).catch(() => null)
            if (typeof s?.received === "number") offset = s.received
          } while (offset < file.size || file.size === 0)
          update(id, { status: "done", sent: file.size })
          onDone()
        } catch (e) {
          update(id, { status: "error", error: (e as Error).message })
        }
      }
    } finally {
      running.current = false
    }
  }, [api, onDone])

  const add = (dir: string, files: File[]) => {
    const jobs = files.map((file) => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, dir, file }))
    setItems((l) => [...l, ...jobs.map((j) => ({ id: j.id, name: j.file.name, size: j.file.size, sent: 0, status: "waiting" as const, bps: 0 }))])
    queue.current.push(...jobs)
    void pump()
  }
  const clearDone = () => setItems((l) => l.filter((i) => i.status !== "done" && i.status !== "error"))
  return { items, add, clearDone }
}

function UploadList({ items, onClear }: { items: UploadItem[]; onClear: () => void }) {
  if (!items.length) return null
  const finished = items.every((i) => i.status === "done" || i.status === "error")
  return (
    <div data-upload-list className="mt-4 rounded-lg border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>上传 · {items.filter((i) => i.status === "done").length}/{items.length} 完成</span>
        {finished && (
          <button type="button" onClick={onClear} className="cursor-pointer hover:text-foreground">
            清除
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {items.map((i) => {
          const pct = i.size ? Math.round((i.sent / i.size) * 100) : i.status === "done" ? 100 : 0
          const left = i.status === "uploading" && i.bps > 0 ? (i.size - i.sent) / i.bps : null
          return (
            <li key={i.id} data-upload-item={i.status} className="text-sm">
              <div className="flex justify-between gap-2">
                <span className="min-w-0 truncate">{i.name}</span>
                <span className={cn("shrink-0 text-xs tabular-nums", i.status === "error" ? "text-destructive" : "text-muted-foreground")}>
                  {i.status === "done"
                    ? "已传完"
                    : i.status === "error"
                      ? i.error
                      : i.status === "waiting"
                        ? "排队中"
                        : `${pct}%${left !== null ? ` · 约 ${left < 60 ? `${Math.ceil(left)} 秒` : `${Math.ceil(left / 60)} 分钟`}` : ""}`}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${i.name} 上传进度`}>
                <div className={cn("h-full rounded-full", i.status === "error" ? "bg-destructive" : "bg-primary")} style={{ width: `${pct}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
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
