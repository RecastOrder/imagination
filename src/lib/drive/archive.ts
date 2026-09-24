import JSZip from "jszip"

import type { DriveNode } from "./types"

/**
 * 在浏览器里读取 ZIP 的目录，不整体解压：点到哪个文件才单独解出哪个。
 * 安全与兼容：
 * - 中文文件名：先按 UTF-8 解码，失败再按 GBK（国内 Windows 打包的 ZIP 常用 GBK，不处理就是乱码）
 * - 压缩炸弹：限制文件数量和解压后的总大小
 * - 路径穿越：忽略带 “..” 或以 “/” 开头的条目
 * - 加密压缩包：第一期不支持，给出明确提示
 */
const MAX_ENTRIES = 2000
const MAX_TOTAL_BYTES = 1024 * 1024 * 1024 // 1 GB

const utf8 = new TextDecoder("utf-8", { fatal: true })
const gbk = new TextDecoder("gbk")
function decodeName(bytes: string[] | Uint8Array | Buffer) {
  const u8 = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes as string[], (c) => c.charCodeAt(0))
  try {
    return utf8.decode(u8)
  } catch {
    return gbk.decode(u8)
  }
}

const cache = new Map<string, Promise<JSZip>>()

export class ArchiveError extends Error {}

export function openArchive(archiveId: string, url: string): Promise<JSZip> {
  let p = cache.get(archiveId)
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new ArchiveError("压缩包下载失败")
        return r.arrayBuffer()
      })
      .then((buf) => JSZip.loadAsync(buf, { decodeFileName: decodeName }))
      .catch((e: Error) => {
        cache.delete(archiveId)
        if (/encrypt/i.test(e.message)) throw new ArchiveError("这是加密的压缩包，第一期暂不支持输入密码浏览")
        throw e instanceof ArchiveError ? e : new ArchiveError("无法读取这个压缩包，文件可能已损坏")
      })
    cache.set(archiveId, p)
  }
  return p
}

/** 把压缩包里的条目转换成目录树节点 */
export async function listArchive(archiveId: string, url: string): Promise<DriveNode[]> {
  const zip = await openArchive(archiveId, url)
  const entries = Object.values(zip.files)
  if (entries.length > MAX_ENTRIES) throw new ArchiveError(`压缩包内文件超过 ${MAX_ENTRIES} 个，请下载后在本机打开`)
  let total = 0
  const root: DriveNode[] = []
  const folders = new Map<string, DriveNode[]>([["", root]])
  const ensureFolder = (path: string): DriveNode[] => {
    if (folders.has(path)) return folders.get(path)!
    const parentPath = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ""
    const parent = ensureFolder(parentPath)
    const children: DriveNode[] = []
    parent.push({ type: "folder", id: `${archiveId}!${path}/`, name: path.split("/").pop()!, children })
    folders.set(path, children)
    return children
  }
  for (const e of entries) {
    const name = e.name.replace(/\/$/, "")
    if (!name || name.startsWith("/") || name.split("/").includes("..") || name.startsWith("__MACOSX")) continue
    if (e.dir) {
      ensureFolder(name)
      continue
    }
    // JSZip 的内部字段里有解压后的大小，用来提前拦截压缩炸弹
    total += (e as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0
    if (total > MAX_TOTAL_BYTES) throw new ArchiveError("压缩包解压后超过 1 GB，请下载后在本机打开")
    const dir = name.includes("/") ? name.slice(0, name.lastIndexOf("/")) : ""
    ensureFolder(dir).push({
      type: "file",
      id: `${archiveId}!${name}`,
      name: name.split("/").pop()!,
      size: (e as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize,
      updatedAt: e.date?.getTime(),
      zip: { archiveId, path: e.name },
    })
  }
  return root
}

export async function readArchiveEntry(archiveId: string, url: string, path: string): Promise<Blob> {
  const zip = await openArchive(archiveId, url)
  const entry = zip.file(path)
  if (!entry) throw new ArchiveError("压缩包里找不到这个文件")
  return entry.async("blob")
}
