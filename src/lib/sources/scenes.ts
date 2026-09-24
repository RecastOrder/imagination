import { createLocalStore } from "@/lib/local-store"
import type { SourceFilters } from "./types"

/**
 * 使用场景（视图）：本质是“预设好的筛选条件”，底下还是同一个资料库。
 * 不按“技术 / 设计”一刀切，而是按“我现在要干什么”来分；
 * 每个人还可以把常用的筛选保存成自己的视图。
 */
export interface Scene {
  id: string
  label: string
  hint?: string
  filters: SourceFilters
}

export const PRESET_SCENES: Scene[] = [
  { id: "all", label: "全部", filters: { kinds: [], regions: [] } },
  { id: "codes", label: "查规范", hint: "规范、规章：有效力的依据", filters: { kinds: ["standard"], regions: [] } },
  { id: "details", label: "找构造做法", hint: "图集与标准做法", filters: { kinds: ["atlas"], regions: [] } },
  { id: "research", label: "研读期刊", hint: "杂志、论文、专著", filters: { kinds: ["magazine", "article", "book"], regions: [] } },
  { id: "inspire", label: "看案例", hint: "项目报道、图片", filters: { kinds: ["report", "magazine"], regions: [] } },
]

export const myScenesStore = createLocalStore<Scene[]>("pref:library-scenes", [])

const norm = (f: SourceFilters) =>
  JSON.stringify({
    q: f.q ?? "",
    k: [...f.kinds].sort(),
    r: [...f.regions].sort(),
    a: f.yearFrom ?? 0,
    b: f.yearTo ?? 0,
  })

export const sameFilters = (a: SourceFilters, b: SourceFilters) => norm(a) === norm(b)
