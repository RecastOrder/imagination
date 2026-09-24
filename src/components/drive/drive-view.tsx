"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { usePanelRef } from "react-resizable-panels"
import {
  ChevronRightIcon,
  DownloadIcon,
  FolderIcon,
  FolderTreeIcon,
  InfoIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Segmented } from "@/components/ui/segmented"
import { ResizableGroup, ResizableHandle, ResizablePanel } from "@/components/ui/resizable"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useMinWidth } from "@/hooks/use-media-query"
import { listArchive } from "@/lib/drive/archive"
import { FORMATS, SUPPORT_LABEL, formatOf } from "@/lib/drive/formats"
import { SPACES, allRoots, rootsFor, spaceOf, type Space } from "@/lib/drive/sample-tree"
import type { DriveFile, DriveNode } from "@/lib/drive/types"
import { formatBytes } from "@/lib/files/checksum"
import { cn } from "@/lib/utils"
import { FileTree } from "./file-tree"
import { ViewerHost } from "./viewer-host"
import { SourceViewer } from "./viewers/source-viewer"

/**
 * 文件浏览（左侧目录 + 中间阅读）。
 *
 *  ┌ 目录树（可拖宽 / 收起）┬ 面包屑 · 操作 ─────────────┬ 信息（可选）┐
 *  │ ▾ 某住宅项目          │                          │            │
 *  │   ▸ 01 资料依据       │   按格式选择的查看器        │            │
 *  │ ▸ 资料库             │                          │            │
 *  └──────────────────────┴──────────────────────────┴────────────┘
 *
 * 选中的文件记在网址里（?f=…），可以分享链接、用浏览器后退。
 * 平台资料库、个人项目文件、压缩包内部都用同一棵树、同一套查看器。
 */
export function DriveView({ projectIds }: { projectIds: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const selectedId = params.get("f")
  // 当前空间：选中的文件属于哪个空间就是哪个；没选文件时看网址参数，默认先看项目
  const space: Space =
    spaceOf(selectedId) ?? (params.get("space") as Space | null) ?? (projectIds.length ? "project" : "public")
  const roots = useMemo(() => rootsFor(space, projectIds), [space, projectIds])
  const everything = useMemo(() => allRoots(projectIds), [projectIds])
  const isLg = useMinWidth("lg")
  const treePanel = usePanelRef()
  const [treeCollapsed, setTreeCollapsed] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [info, setInfo] = useState(false)
  // 默认展开每个空间的根目录
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["lib", "me", ...projectIds.map((id) => `proj/${id}`)]))
  const [zipKids, setZipKids] = useState<Record<string, DriveNode[]>>({})
  const [loading, setLoading] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})

  const childrenOf = useCallback(
    (n: DriveNode) => (n.type === "folder" ? n.children : n.type === "file" && n.archive ? zipKids[n.id] : undefined),
    [zipKids],
  )

  // 索引：id → 节点 + 父节点（包括已经展开的压缩包内部）
  const index = useMemo(() => {
    const map = new Map<string, { node: DriveNode; parent: string | null }>()
    const walk = (nodes: DriveNode[], parent: string | null) => {
      for (const n of nodes) {
        map.set(n.id, { node: n, parent })
        const kids = childrenOf(n)
        if (kids) walk(kids, n.id)
      }
    }
    walk(everything, null)
    return map
  }, [childrenOf, everything])

  const archiveUrl = useCallback(
    (archiveId: string) => {
      const n = index.get(archiveId)?.node
      return n?.type === "file" ? n.url : undefined
    },
    [index],
  )

  const loadArchive = useCallback(
    async (n: DriveNode) => {
      if (n.type !== "file" || !n.archive || zipKids[n.id] || !n.url) return
      setLoading((s) => new Set(s).add(n.id))
      try {
        const kids = await listArchive(n.id, n.url)
        setZipKids((z) => ({ ...z, [n.id]: kids }))
        setErrors((er) => {
          const rest = { ...er }
          delete rest[n.id]
          return rest
        })
      } catch (e) {
        setErrors((er) => ({ ...er, [n.id]: (e as Error).message }))
      } finally {
        setLoading((s) => {
          const x = new Set(s)
          x.delete(n.id)
          return x
        })
      }
    },
    [zipKids],
  )

  const toggle = useCallback(
    (n: DriveNode, open: boolean) => {
      setExpanded((s) => {
        const x = new Set(s)
        if (open) x.add(n.id)
        else x.delete(n.id)
        return x
      })
      if (open) loadArchive(n)
    },
    [loadArchive],
  )

  const select = useCallback(
    (n: DriveNode) => {
      const next = new URLSearchParams(params.toString())
      next.set("f", n.id)
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
      if (n.type === "file" && n.archive) loadArchive(n)
      if (n.type !== "folder") setDrawer(false)
    },
    [params, pathname, router, loadArchive],
  )

  // 通过链接打开时：展开所在文件夹；如果在压缩包里，先把压缩包读出来
  useEffect(() => {
    if (!selectedId) return
    const archiveId = selectedId.includes("!") ? selectedId.slice(0, selectedId.indexOf("!")) : null
    // 选中的是压缩包里的文件，或者压缩包本身：都要先把压缩包目录读出来
    const archive = archiveId ? index.get(archiveId)?.node : index.get(selectedId)?.node
    if (archive?.type === "file" && archive.archive && !zipKids[archive.id]) loadArchive(archive)
    const ids: string[] = []
    let cur = index.get(selectedId)?.parent ?? archiveId
    while (cur) {
      ids.push(cur)
      cur = index.get(cur)?.parent ?? null
    }
    if (ids.some((id) => !expanded.has(id))) setExpanded((s) => new Set([...s, ...ids]))
  }, [selectedId, index, zipKids, loadArchive, expanded])

  const selected = selectedId ? index.get(selectedId)?.node : undefined
  const crumbs: DriveNode[] = []
  for (let id: string | null | undefined = selectedId; id; id = index.get(id)?.parent) {
    const n = index.get(id)?.node
    if (n) crumbs.unshift(n)
  }

  const switchSpace = (v: Space) => {
    const next = new URLSearchParams()
    next.set("space", v)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  const tree = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-2 pt-2">
        {/* 三个空间：公共（资料库）/ 项目（我参与的）/ 我的（仅自己） */}
        <Segmented
          label="空间"
          value={space}
          onChange={switchSpace}
          options={SPACES.map((s) => ({ value: s.value, label: s.label }))}
          className="w-full [&>button]:flex-1 [&>button]:justify-center"
        />
      </div>
      {space === "project" && roots.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">你还没有加入任何项目。请联系项目负责人把你加入项目成员。</p>
      ) : (
        <div className="min-h-0 flex-1">
    <FileTree
      roots={roots}
      selectedId={selectedId}
      expanded={expanded}
      onToggle={toggle}
      onSelect={select}
      childrenOf={childrenOf}
      loading={loading}
      errors={errors}
    />
        </div>
      )}
    </div>
  )

  const toggleTree = () => {
    if (!isLg) return setDrawer(true)
    const p = treePanel.current
    if (!p) return
    if (p.isCollapsed()) p.expand()
    else p.collapse()
  }

  const content = (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-11 shrink-0 items-center gap-1 border-b px-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTree}
          aria-label={isLg && !treeCollapsed ? "收起目录" : "显示目录"}
          title={isLg && !treeCollapsed ? "收起目录" : "显示目录"}
        >
          {isLg && !treeCollapsed ? <PanelLeftCloseIcon /> : isLg ? <PanelLeftOpenIcon /> : <FolderTreeIcon />}
        </Button>
        <nav aria-label="位置" className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto text-sm whitespace-nowrap">
          {crumbs.length === 0 && <span className="px-1 text-muted-foreground">选择一个文件</span>}
          {crumbs.map((c, i) => (
            <span key={c.id} className="flex items-center gap-0.5">
              {i > 0 && <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />}
              {i < crumbs.length - 1 ? (
                <button type="button" onClick={() => select(c)} className="cursor-pointer rounded px-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                  {c.name}
                </button>
              ) : (
                <span className="px-1 font-medium">{c.name}</span>
              )}
            </span>
          ))}
        </nav>
        {selected?.type === "file" && selected.url && !selected.zip && (
          <Button asChild variant="ghost" size="icon-sm" aria-label="下载">
            <a href={selected.url} download={selected.name} title="下载">
              <DownloadIcon />
            </a>
          </Button>
        )}
        {selected && selected.type !== "folder" && (
          <Button variant="ghost" size="icon-sm" aria-pressed={info} onClick={() => setInfo((v) => !v)} aria-label="文件信息" title="文件信息" className="hidden xl:inline-flex">
            <InfoIcon />
          </Button>
        )}
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-hidden">
          {!selected ? (
            <EmptyState />
          ) : selected.type === "folder" || (selected.type === "file" && selected.archive) ? (
            <FolderView node={selected} items={childrenOf(selected)} loading={loading.has(selected.id)} error={errors[selected.id]} onOpen={select} />
          ) : selected.type === "source" ? (
            <SourceViewer sourceId={selected.sourceId} />
          ) : (
            <ViewerHost file={selected} archiveUrl={archiveUrl} />
          )}
        </div>
        {info && selected?.type === "file" && <InfoPanel file={selected} path={crumbs.slice(0, -1).map((c) => c.name).join(" / ")} />}
      </div>
    </div>
  )

  return (
    <div className="h-full">
      {/*
        内容区只渲染一份（否则查看器会加载两次、快捷键触发两次）。
        这个页面依赖网址参数，本来就在浏览器端渲染，按屏幕宽度用 JS 选布局不会出现首屏闪烁。
        桌面：可拖宽、可收起的分栏；手机：目录放进抽屉。
      */}
      {isLg ? (
        <ResizableGroup orientation="horizontal">
          <ResizablePanel
            id="tree"
            panelRef={treePanel}
            defaultSize={280}
            minSize={200}
            maxSize={480}
            collapsible
            collapsedSize={0}
            onResize={(s) => setTreeCollapsed(s.inPixels < 1)}
            groupResizeBehavior="preserve-pixel-size"
            className="h-full bg-sidebar/40"
          >
            <aside aria-label="目录" className="h-full">
              {tree}
            </aside>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel id="content" minSize={360} className="h-full">
            {content}
          </ResizablePanel>
        </ResizableGroup>
      ) : (
        content
      )}
      <Sheet open={drawer && !isLg} onOpenChange={setDrawer}>
        <SheetContent side="left" className="w-[85vw] max-w-80 p-0" showClose={false}>
          <SheetTitle className="border-b px-4 py-3 text-sm">目录</SheetTitle>
          <div className="min-h-0 flex-1">{tree}</div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

/** 文件夹（或压缩包）被选中时：像 Finder 一样列出里面的内容 */
function FolderView({
  node,
  items,
  loading,
  error,
  onOpen,
}: {
  node: DriveNode
  items?: DriveNode[]
  loading: boolean
  error?: string
  onOpen: (n: DriveNode) => void
}) {
  const isArchive = node.type === "file"
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="flex items-center gap-2 text-lg font-semibold">
          <FolderIcon className="size-5 text-muted-foreground" />
          {node.name}
        </p>
        {isArchive && (
          <p className="mt-1 text-sm text-muted-foreground">压缩包：不用整体解压，点击里面的文件即可单独预览。中文文件名已自动识别编码。</p>
        )}
        {error && <p className="mt-4 rounded-lg bg-surface-sunken p-3 text-sm text-destructive">{error}</p>}
        {loading && <p className="mt-4 text-sm text-muted-foreground">正在读取…</p>}
        {items && items.length === 0 && <p className="mt-6 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">这个文件夹是空的</p>}
        {items && items.length > 0 && (
          <ul className="mt-5 divide-y rounded-xl border bg-surface">
            {items.map((n) => {
              const f = n.type === "file" ? formatOf(n.name) : null
              return (
                <li key={n.id}>
                  <button type="button" onClick={() => onOpen(n)} className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/50">
                    <span className="min-w-0 flex-1 truncate text-sm">{n.name}</span>
                    {f && (
                      <Badge variant={f.support === "full" ? "neutral" : "outline"} className="shrink-0">
                        {f.support === "full" ? f.label : SUPPORT_LABEL[f.support]}
                      </Badge>
                    )}
                    {n.type === "folder" && <span className="text-xs text-muted-foreground">{n.children.length} 项</span>}
                    {n.type === "file" && n.size !== undefined && <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">{formatBytes(n.size)}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function InfoPanel({ file, path }: { file: DriveFile; path: string }) {
  const f = formatOf(file.name)
  const rows: [string, string][] = [
    ["类型", f.label],
    ["预览", SUPPORT_LABEL[f.support]],
    ["大小", file.size !== undefined ? formatBytes(file.size) : "—"],
    ["修改时间", file.updatedAt ? new Date(file.updatedAt).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" }) : "—"],
    ["位置", path || "—"],
  ]
  return (
    <aside aria-label="文件信息" className="w-72 shrink-0 overflow-y-auto border-l bg-surface p-4">
      <p className="font-medium break-all">{file.name}</p>
      <dl className="mt-4 space-y-2.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3">
            <dt className="w-16 shrink-0 text-muted-foreground">{k}</dt>
            <dd className="min-w-0 flex-1 break-all">{v}</dd>
          </div>
        ))}
      </dl>
    </aside>
  )
}

/** 什么都没选时：告诉用户能打开哪些格式 */
function EmptyState() {
  const groups = { full: [] as string[], phase2: [] as string[], later: [] as string[] }
  const seen = new Set<string>()
  for (const [ext, f] of Object.entries(FORMATS)) {
    if (seen.has(f.label)) continue
    seen.add(f.label)
    ;(f.support === "full" ? groups.full : f.support === "phase2" ? groups.phase2 : groups.later).push(`${f.label}（.${ext}）`)
  }
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <FolderTreeIcon className="size-8 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">从左侧目录选择一个文件</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          上方切换三个空间：公共（资料库）、项目（你参与的项目）、我的（仅自己可见）。用 ↑↓ 移动，→ 展开，Enter 打开。打开 PDF、图片、Office 后可以标注和测量。
        </p>
        {[
          ["现在就能直接打开", groups.full, "neutral"],
          ["后续支持", groups.phase2, "outline"],
          ["不在线预览（下载后用本机软件打开）", groups.later, "outline"],
        ].map(([title, list, variant]) => (
          <section key={title as string} className="mt-6">
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">{title as string}</h3>
            <div className="flex flex-wrap gap-1.5">
              {(list as string[]).map((l) => (
                <Badge key={l} variant={variant as "neutral" | "outline"} className={cn(variant === "outline" && "text-muted-foreground")}>
                  {l}
                </Badge>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
