/**
 * 文件校验（浏览器端）。
 *
 * 做法：把文件切成 4 MB 的块，每块单独算 SHA-256；
 * 再把所有块的哈希拼起来算一次 SHA-256，作为整个文件的“指纹”。
 *
 * 为什么分块：
 * 1. 大文件（几 GB 的模型、图纸）不用一次读进内存；
 * 2. 上传时服务器可以逐块核对，哪块坏了只重传哪块；
 * 3. 断网后知道哪些块已经传好，可以断点续传。
 * 指纹相同 = 内容完全相同，服务器已有同样文件就不用再传（“秒传”）。
 */
export const CHUNK_SIZE = 4 * 1024 * 1024

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("")
}

export function chunkCount(size: number) {
  return Math.max(1, Math.ceil(size / CHUNK_SIZE))
}

/** 逐块计算哈希，每算完一块回调一次进度；signal 用于暂停 / 取消 */
export async function hashFile(
  file: Blob,
  onProgress: (done: number, total: number, chunks: string[]) => void,
  signal?: AbortSignal,
  startFrom: string[] = [],
): Promise<{ chunks: string[]; fingerprint: string }> {
  const total = chunkCount(file.size)
  const chunks = [...startFrom]
  for (let i = chunks.length; i < total; i++) {
    if (signal?.aborted) throw new DOMException("paused", "AbortError")
    const part = await file.slice(i * CHUNK_SIZE, Math.min(file.size, (i + 1) * CHUNK_SIZE)).arrayBuffer()
    chunks.push(await sha256Hex(part))
    onProgress(i + 1, total, [...chunks])
  }
  const fingerprint = await sha256Hex(new TextEncoder().encode(chunks.join("")).buffer as ArrayBuffer)
  return { chunks, fingerprint }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  const units = ["KB", "MB", "GB", "TB"]
  let v = n / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`
}
