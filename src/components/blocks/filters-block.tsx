"use client"

import Link from "next/link"
import { ArrowRightIcon, SlidersHorizontalIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { filterChips, filtersToSearch } from "@/lib/sources/filters"
import type { BlockProps } from "./registry"

/**
 * “对话 → 检索”的桥：AI 把一句话解析成结构化条件，展示给用户确认，
 * 点击后带着这些条件进入资料库，继续精确筛选。
 */
export function FiltersBlock({ block }: BlockProps<"filters">) {
  const chips = filterChips(block.filters)
  return (
    <div className="rounded-lg border border-dashed bg-surface-sunken/60 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <SlidersHorizontalIcon className="size-3.5" />
        我理解的检索条件
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {chips.map((c) => (
          <Badge key={c.key} variant="primary">
            {c.label}
          </Badge>
        ))}
        <Link
          href={`/library${filtersToSearch(block.filters)}`}
          className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          在资料库中查看全部 {block.total} 条
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}
