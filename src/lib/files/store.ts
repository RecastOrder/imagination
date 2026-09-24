import { createLocalStore } from "@/lib/local-store"

export type FileOrigin = "local" | "baidu"

/**
 * 云盘文件 ≠ 知识库资料：
 * 文件上传后只是“存着”；点“加入知识库”才会解析、建索引，AI 才能引用它。
 */
export type KbState = "none" | "parsing" | "ready"

export interface FileEntry {
  id: string
  name: string
  /** 版本号：同名但内容不同的文件自动递增，旧版本保留 */
  version: number
  size: number
  fingerprint: string
  origin: FileOrigin
  path?: string
  uploadedAt: number
  kb: KbState
}

const t = Date.UTC(2026, 8, 18)

const SEED: FileEntry[] = [
  {
    id: "f1",
    name: "某住宅项目-总平面.dwg",
    version: 2,
    size: 38_400_000,
    fingerprint: "9c1e4b7a2f0d8e63a1b5c7d9e2f4a6b8c0d1e3f5a7b9c2d4e6f8a0b1c3d5e7f9",
    origin: "local",
    uploadedAt: t,
    kb: "none",
  },
  {
    id: "f1-v1",
    name: "某住宅项目-总平面.dwg",
    version: 1,
    size: 35_100_000,
    fingerprint: "71be0c9d4a3f2e1b8c7d6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d",
    origin: "local",
    uploadedAt: t - 3 * 86400_000,
    kb: "none",
  },
  {
    id: "f2",
    name: "GB 50016-2014 建筑设计防火规范.pdf",
    version: 1,
    size: 18_900_000,
    fingerprint: "3f2a9d6c1b8e7f4a5d2c9b6e3a0f7d4c1b8e5a2f9c6d3b0e7a4f1c8d5b2e9a6f",
    origin: "baidu",
    path: "/我的资料/规范",
    uploadedAt: t + 3600_000,
    kb: "ready",
  },
  {
    id: "f3",
    name: "立面参数化-v3.gh",
    version: 1,
    size: 2_150_000,
    fingerprint: "a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3",
    origin: "local",
    uploadedAt: t + 7200_000,
    kb: "none",
  },
]

// v2：加入了版本号字段，换一个存储键，避免读到旧格式的数据
export const filesStore = createLocalStore<FileEntry[]>("files:list:v2", SEED)

export interface FileGroup {
  name: string
  /** 当前版本（版本号最大的） */
  current: FileEntry
  /** 历史版本，新 → 旧 */
  history: FileEntry[]
}

/** 按文件名分组：列表只显示当前版本，历史版本折叠在下面 */
export function groupFiles(files: FileEntry[]): FileGroup[] {
  const map = new Map<string, FileEntry[]>()
  for (const f of files) map.set(f.name, [...(map.get(f.name) ?? []), f])
  return Array.from(map, ([name, list]) => {
    const sorted = [...list].sort((a, b) => b.version - a.version)
    return { name, current: sorted[0], history: sorted.slice(1) }
  }).sort((a, b) => b.current.uploadedAt - a.current.uploadedAt)
}

/**
 * 决定一个新上传的文件怎么保存：
 * - 同名且内容相同 → 已存在，不重复保存
 * - 同名但内容不同 → 自动保存为新版本（版本号 +1），旧版本保留
 * - 新文件名 → 版本 1
 */
export function resolveVersion(
  files: FileEntry[],
  name: string,
  fingerprint: string,
): { kind: "duplicate"; version: number } | { kind: "new"; version: number } {
  const same = files.filter((f) => f.name === name)
  const dup = same.find((f) => f.fingerprint === fingerprint)
  if (dup) return { kind: "duplicate", version: dup.version }
  return { kind: "new", version: same.length ? Math.max(...same.map((f) => f.version)) + 1 : 1 }
}

/** 演示：当前用户的存储配额（GB） */
export const STORAGE_QUOTA_GB = 50
