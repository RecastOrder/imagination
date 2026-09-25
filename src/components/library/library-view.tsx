"use client"

import { useMemo, useRef, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SourceCard } from "@/components/source/source-card"
import { usePeek } from "@/hooks/use-peek"
import { filterChips, filtersToSearch, matchSource, parseFilters } from "@/lib/sources/filters"
import { useSourceList } from "@/hooks/use-sources"
import type { SourceFilters } from "@/lib/sources/types"
import { Facets } from "./facets"
import { SceneBar } from "./scene-bar"

/**
 * 资料库（检索入口）。适合“我知道要找什么”：某地某年的某本规范、某篇报道。
 * 所有筛选条件都写在 URL 里 —— 和对话里 AI 解析出的条件是同一种格式，
 * 所以对话可以一键把条件“交接”到这里。
 */
const SHOWN = 100

export function LibraryView() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const filters = useMemo(() => parseFilters(params), [params])
  const { peekId, openPeek } = usePeek()
  const inputRef = useRef<HTMLInputElement>(null)
  const { sources, regions, loading, error } = useSourceList()

  useEffect(() => {
    if (params.get("focus")) inputRef.current?.focus()
  }, [params])

  const setFilters = (next: SourceFilters) => {
    const s = new URLSearchParams(filtersToSearch(next))
    if (peekId) s.set("peek", peekId)
    const qs = s.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const results = sources.filter((s) => matchSource(s, filters))
  /** 一次只画前 SHOWN 条：资料有几千份，全画出来页面会卡；总数照常显示 */
  const shown = results.slice(0, SHOWN)
  const chips = filterChips(filters)

  return (
    <div className="flex h-full flex-col">
      <header className="border-b bg-background px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <h1 className="mr-2 hidden text-base font-semibold sm:block">资料库</h1>
          <form
            className="relative flex-1"
            onSubmit={(e) => {
              e.preventDefault()
              const q = new FormData(e.currentTarget).get("q")?.toString().trim()
              setFilters({ ...filters, q: q || undefined })
            }}
          >
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              key={filters.q ?? ""}
              name="q"
              defaultValue={filters.q}
              placeholder="书名、规范编号、建筑师、关键词…"
              className="h-10 pr-12 pl-9"
            />
            <Kbd className="absolute top-1/2 right-3 hidden -translate-y-1/2 sm:inline-flex">⌘K</Kbd>
          </form>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-10 lg:hidden">
                <SlidersHorizontalIcon />
                筛选
                {chips.length > 0 && <span className="text-primary tabular-nums">{chips.length}</span>}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80dvh]">
              <SheetTitle className="border-b px-4 py-3 text-base">筛选</SheetTitle>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <Facets sources={sources} regions={regions} filters={filters} onChange={setFilters} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="mx-auto mt-3 max-w-5xl">
          <SceneBar filters={filters} onChange={setFilters} />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-5xl gap-8 px-4 py-6 sm:px-6">
          <aside className="hidden w-52 shrink-0 lg:block" aria-label="筛选">
            <Facets sources={sources} regions={regions} filters={filters} onChange={setFilters} />
          </aside>

          <section className="min-w-0 flex-1" aria-label="检索结果">
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <p className="mr-2 text-sm text-muted-foreground">
                共 <span className="font-medium text-foreground tabular-nums">{results.length}</span> 份资料
              </p>
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setFilters(c.remove())}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-sm bg-primary-subtle px-1.5 py-0.5 text-xs font-medium text-primary-subtle-foreground hover:bg-primary-subtle/70"
                  aria-label={`移除条件 ${c.label}`}
                >
                  {c.label}
                  <XIcon className="size-3" />
                </button>
              ))}
              {chips.length > 1 && (
                <Button variant="link" size="sm" className="h-auto px-1 text-xs" onClick={() => setFilters({ kinds: [], regions: [] })}>
                  清除全部
                </Button>
              )}
            </div>

            {loading ? (
              <p className="py-16 text-center text-sm text-muted-foreground">正在加载资料…</p>
            ) : error ? (
              <div className="rounded-lg border border-dashed px-6 py-16 text-center">
                <p className="font-medium">资料列表没有加载出来</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
            ) : results.length ? (
              <div className="space-y-2">
                {shown.map((s) => (
                  <SourceCard key={s.id} source={s} active={peekId === s.id} onOpen={openPeek} />
                ))}
                {results.length > shown.length && (
                  <p className="py-3 text-center text-xs text-muted-foreground">
                    只显示前 {shown.length} 份，共 {results.length} 份 —— 加关键词或筛选条件缩小范围
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed px-6 py-16 text-center">
                <p className="font-medium">没有符合条件的资料</p>
                <p className="mt-1 text-sm text-muted-foreground">试试减少筛选条件，或者换个关键词</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setFilters({ kinds: [], regions: [] })}>
                  清除所有条件
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
