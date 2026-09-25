import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { SOURCES as MOCK_SOURCES } from "@/lib/sources/mock"
import type { Source, SourceKind, SourceMeta, SourceSection } from "@/lib/sources/types"

/**
 * 资料仓库：资料库、预览、阅读页取资料的唯一入口（只在服务端用）。
 *
 * 两种实现，由环境变量 SOURCES_BACKEND 选：
 * - mock（默认）：src/lib/sources/mock.ts 里的演示资料
 * - cairn-kb：Cairn 知识库的资料卡目录（CAIRN_KB_SOURCES_DIR，每份资料一个 *.source.md）
 *
 * cairn-kb 资料卡里没有的字段一律不编：效力状态记“未核对”（unverified），地区记“未核对”。
 */
export interface SourceRepository {
  list(): SourceMeta[]
  get(id: string): Source | undefined
}

const UNVERIFIED_REGION = "地区未核对"

const mockRepo: SourceRepository = {
  list: () => MOCK_SOURCES.map(toMeta),
  get: (id) => MOCK_SOURCES.find((s) => s.id === id),
}

function toMeta(source: Source): SourceMeta {
  const meta: Partial<Source> = { ...source }
  delete meta.sections
  return meta as SourceMeta
}

// ---------------------------------------------------------------- cairn-kb

/** 资料卡 frontmatter：只认顶层 `key: value`，续行（缩进）拼回上一个键 */
function parseFrontmatter(text: string): { fm: Record<string, string>; body: string } {
  if (!text.startsWith("---\n")) return { fm: {}, body: text }
  const end = text.indexOf("\n---", 4)
  if (end < 0) return { fm: {}, body: text }
  const fm: Record<string, string> = {}
  let last: string | undefined
  for (const line of text.slice(4, end).split("\n")) {
    const m = /^([A-Za-z_][\w-]*):\s?(.*)$/.exec(line)
    if (m) {
      last = m[1]
      fm[last] = m[2]
    } else if (last && /^\s/.test(line)) {
      fm[last] += " " + line.trim()
    }
  }
  for (const k of Object.keys(fm)) {
    let v = fm[k].trim()
    if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) v = v.slice(1, -1).replace(/''/g, "'")
    fm[k] = v === "null" || v === "~" ? "" : v
  }
  const bodyStart = text.indexOf("\n", end + 4)
  return { fm, body: bodyStart < 0 ? "" : text.slice(bodyStart + 1) }
}

/** 正文按 `<!-- page N -->` 切成每页一节；段落 = 空行分隔的原文块，逐字保留 */
function toSections(body: string): SourceSection[] {
  const re = /<!--\s*page\s+(\d+)\s*-->/g
  const marks = [...body.matchAll(re)]
  const chunks: { page: number; text: string }[] = marks.length
    ? marks.map((m, i) => ({
        page: Number(m[1]),
        text: body.slice(m.index! + m[0].length, i + 1 < marks.length ? marks[i + 1].index : body.length),
      }))
    : [{ page: 1, text: body }]
  if (marks.length && marks[0].index! > 0 && body.slice(0, marks[0].index).trim()) {
    chunks.unshift({ page: 1, text: body.slice(0, marks[0].index) })
  }
  return chunks
    .map(({ page, text }) => ({
      id: `p${page}`,
      title: `第 ${page} 页`,
      page,
      paragraphs: text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean),
    }))
    .filter((s) => s.paragraphs.length > 0)
}

const KIND_BY_TYPE: Record<string, SourceKind | undefined> = {
  regulation: "standard",
  atlas: "atlas",
  document: "article",
}

function cardToSource(id: string, text: string): Source | undefined {
  const { fm, body } = parseFrontmatter(text)
  const kind = KIND_BY_TYPE[fm.source_type]
  if (!kind) return undefined // 如 decision-log：不是资料
  const sections = toSections(body)
  const code = fm.code_id || undefined
  const yearFromCode = code ? /(\d{4})\s*$/.exec(code)?.[1] : undefined
  const year = Number(fm.edition) || Number(yearFromCode) || 0
  const title = (fm.title || id).replace(/\s*\[[0-9a-f]{6,}\]\s*$/, "")
  const plain = sections.flatMap((s) => s.paragraphs).join(" ").replace(/\s+/g, " ")
  return {
    id,
    kind,
    title,
    code,
    region: UNVERIFIED_REGION,
    year,
    tags: [],
    summary: plain.slice(0, 160),
    access: "member",
    status: kind === "standard" ? "unverified" : undefined,
    pages: sections.reduce((n, s) => Math.max(n, s.page), 1),
    sections,
  }
}

function cairnKbRepo(dir: string): SourceRepository {
  // 内存里只放元信息（几 MB）；正文 400 MB 级，打开时再从盘上读 —— 容器有内存上限
  let cache: { key: string; metas: SourceMeta[]; ids: Set<string> } | undefined
  const read = (id: string) => cardToSource(id, readFileSync(join(dir, `${id}.source.md`), "utf8"))
  function load() {
    // 目录 mtime 变了（新增 / 删除资料卡）就重建
    const key = String(statSync(dir).mtimeMs)
    if (cache?.key === key) return cache
    const metas: SourceMeta[] = []
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".source.md")) continue
      const s = read(f.slice(0, -".source.md".length))
      // JSON 往返：切出来的字符串（摘要、标题）在 V8 里会拖住整份原文，不拷一份就等于把 400 MB 正文全留在内存里
      if (s) metas.push(JSON.parse(JSON.stringify(toMeta(s))) as SourceMeta)
    }
    metas.sort((a, b) => (a.code ?? "~").localeCompare(b.code ?? "~"))
    cache = { key, metas, ids: new Set(metas.map((m) => m.id)) }
    return cache
  }
  return {
    list: () => load().metas,
    // 只认列表里有的 id：防止拿路径片段去读目录外的文件
    get: (id) => (load().ids.has(id) ? read(id) : undefined),
  }
}

// 挂在 globalThis 上：启动预热（instrumentation）和接口 / 页面在 Next 里是不同的模块实例，不共享就会各扫一遍
const holder = globalThis as unknown as { __sourcesRepo?: SourceRepository }

export function sourcesRepo(): SourceRepository {
  if (holder.__sourcesRepo) return holder.__sourcesRepo
  let repo: SourceRepository
  const backend = process.env.SOURCES_BACKEND ?? "mock"
  if (backend === "cairn-kb") {
    const dir = process.env.CAIRN_KB_SOURCES_DIR
    if (!dir) throw new Error("SOURCES_BACKEND=cairn-kb 需要设置 CAIRN_KB_SOURCES_DIR")
    repo = cairnKbRepo(dir)
  } else {
    repo = mockRepo
  }
  holder.__sourcesRepo = repo
  return repo
}
