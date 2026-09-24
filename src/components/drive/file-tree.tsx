"use client"

import { useMemo, useRef, useState } from "react"
import {
  BoxIcon,
  ChevronRightIcon,
  FileArchiveIcon,
  FileIcon,
  FileImageIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FolderIcon,
  FolderOpenIcon,
  LoaderCircleIcon,
  PencilRulerIcon,
  SearchIcon,
  type LucideIcon,
} from "lucide-react"

import { SourceKindIcon } from "@/components/source/source-kind-badge"
import { formatOf, type FormatGroup } from "@/lib/drive/formats"
import type { DriveNode } from "@/lib/drive/types"
import { getSource } from "@/lib/sources/mock"
import { cn } from "@/lib/utils"

const GROUP_ICON: Record<FormatGroup, LucideIcon> = {
  文档: FileTextIcon,
  图片: FileImageIcon,
  图纸: PencilRulerIcon,
  三维: BoxIcon,
  表格: FileSpreadsheetIcon,
  压缩包: FileArchiveIcon,
  音视频: FileIcon,
  其他: FileIcon,
}

interface Row {
  node: DriveNode
  depth: number
  parentId: string | null
  expandable: boolean
}

/** 节点是否可以展开：文件夹、以及可以在浏览器里打开的压缩包 */
const isExpandable = (n: DriveNode) => n.type === "folder" || (n.type === "file" && !!n.archive)

/**
 * 左侧目录树（Tree View，参考 VS Code / Finder）。
 * - 键盘：↑↓ 移动，→ 展开 / 进入，← 收起 / 回到上级，Enter 打开
 * - 顶部过滤：只显示名字匹配的文件及其所在文件夹
 * - 压缩包可以像文件夹一样展开（第一次展开时才读取目录）
 * 使用 WAI-ARIA 的 tree / treeitem 角色，读屏软件能正确朗读层级。
 */
export function FileTree({
  roots,
  selectedId,
  expanded,
  onToggle,
  onSelect,
  childrenOf,
  loading,
  errors,
}: {
  roots: DriveNode[]
  selectedId: string | null
  expanded: Set<string>
  onToggle: (node: DriveNode, open: boolean) => void
  onSelect: (node: DriveNode) => void
  /** 取节点的子节点（压缩包的子节点是异步读出来的） */
  childrenOf: (node: DriveNode) => DriveNode[] | undefined
  loading: Set<string>
  errors: Record<string, string>
}) {
  const [filter, setFilter] = useState("")
  const [focusId, setFocusId] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const out: Row[] = []
    // 过滤时：节点自己匹配，或它有匹配的后代，才显示；并且自动展开
    const matches = (n: DriveNode): boolean =>
      n.name.toLowerCase().includes(q) || (childrenOf(n)?.some(matches) ?? false)
    const walk = (nodes: DriveNode[], depth: number, parentId: string | null) => {
      for (const n of nodes) {
        if (q && !matches(n)) continue
        const expandable = isExpandable(n)
        out.push({ node: n, depth, parentId, expandable })
        const kids = childrenOf(n)
        if (expandable && kids && (q ? true : expanded.has(n.id))) walk(kids, depth + 1, n.id)
      }
    }
    walk(roots, 0, null)
    return out
  }, [roots, expanded, filter, childrenOf])

  const current = focusId ?? selectedId ?? rows[0]?.node.id ?? null
  const move = (id: string | null | undefined) => {
    if (!id) return
    setFocusId(id)
    listRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`)?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = rows.findIndex((r) => r.node.id === current)
    const row = rows[i]
    if (!row) return
    const open = expanded.has(row.node.id)
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        move(rows[i + 1]?.node.id)
        break
      case "ArrowUp":
        e.preventDefault()
        move(rows[i - 1]?.node.id)
        break
      case "ArrowRight":
        e.preventDefault()
        if (row.expandable && !open) onToggle(row.node, true)
        else if (row.expandable) move(rows[i + 1]?.node.id)
        break
      case "ArrowLeft":
        e.preventDefault()
        if (row.expandable && open) onToggle(row.node, false)
        else move(row.parentId)
        break
      case "Enter":
      case " ":
        e.preventDefault()
        onSelect(row.node)
        if (row.node.type === "folder") onToggle(row.node, !open)
        break
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="p-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="过滤文件名"
            aria-label="过滤文件名"
            className="h-8 w-full rounded-md border border-input bg-surface pr-2 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
          />
        </div>
      </div>
      <ul ref={listRef} role="tree" aria-label="文件目录" onKeyDown={onKeyDown} className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-4">
        {rows.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">没有匹配“{filter}”的文件</li>}
        {rows.map(({ node, depth, expandable }) => {
          const open = expanded.has(node.id) || (!!filter && expandable)
          const selected = node.id === selectedId
          const isLoading = loading.has(node.id)
          const err = errors[node.id]
          return (
            <li
              key={node.id}
              data-id={node.id}
              role="treeitem"
              aria-level={depth + 1}
              aria-expanded={expandable ? open : undefined}
              aria-selected={selected}
              tabIndex={node.id === current ? 0 : -1}
              onFocus={() => setFocusId(node.id)}
              onClick={() => {
                setFocusId(node.id)
                onSelect(node)
                if (node.type === "folder") onToggle(node, !open)
              }}
              title={err ?? node.name}
              className={cn(
                "group flex h-8 cursor-pointer items-center gap-1.5 rounded-md pr-2 text-sm outline-none select-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50",
                selected && "bg-primary-subtle text-primary-subtle-foreground hover:bg-primary-subtle",
                depth === 0 && "font-medium",
              )}
              style={{ paddingLeft: 6 + depth * 14 }}
            >
              {expandable ? (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={open ? "收起" : "展开"}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggle(node, !open)
                  }}
                  className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                >
                  {isLoading ? (
                    <LoaderCircleIcon className="size-3.5 animate-spin" />
                  ) : (
                    <ChevronRightIcon className={cn("size-3.5 transition-transform", open && "rotate-90")} />
                  )}
                </button>
              ) : (
                <span className="size-4 shrink-0" />
              )}
              <NodeIcon node={node} open={open} selected={selected} />
              <span className={cn("min-w-0 flex-1 truncate", err && "text-destructive")}>{node.name}</span>
              {depth === 0 && node.type === "folder" && node.hint && (
                <span className="shrink-0 text-[11px] font-normal text-muted-foreground">{node.hint}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function NodeIcon({ node, open, selected }: { node: DriveNode; open: boolean; selected: boolean }) {
  const cls = cn("size-4 shrink-0 text-muted-foreground", selected && "text-primary")
  if (node.type === "folder") {
    const I = open ? FolderOpenIcon : FolderIcon
    return <I className={cls} />
  }
  if (node.type === "source") {
    const s = getSource(node.sourceId)
    return s ? <SourceKindIcon kind={s.kind} className={cls} /> : <FileIcon className={cls} />
  }
  const I = GROUP_ICON[formatOf(node.name).group]
  return <I className={cls} />
}
