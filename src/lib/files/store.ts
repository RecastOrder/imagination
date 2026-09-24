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
    size: 38_400_000,
    fingerprint: "9c1e4b7a2f0d8e63a1b5c7d9e2f4a6b8c0d1e3f5a7b9c2d4e6f8a0b1c3d5e7f9",
    origin: "local",
    uploadedAt: t,
    kb: "none",
  },
  {
    id: "f2",
    name: "GB 50016-2014 建筑设计防火规范.pdf",
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
    size: 2_150_000,
    fingerprint: "a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3",
    origin: "local",
    uploadedAt: t + 7200_000,
    kb: "none",
  },
]

export const filesStore = createLocalStore<FileEntry[]>("files:list", SEED)

/** 演示：当前用户的存储配额（GB） */
export const STORAGE_QUOTA_GB = 50
