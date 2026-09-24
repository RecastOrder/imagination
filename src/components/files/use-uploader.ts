"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { CHUNK_SIZE, chunkCount, hashFile } from "@/lib/files/checksum"
import { filesStore, type FileOrigin } from "@/lib/files/store"

/**
 * 上传队列（演示版）。
 * - “计算校验值”是真的：浏览器里逐块算 SHA-256；
 * - “上传 / 服务器校验 / 百度网盘拉取”是模拟的，接入后端后替换 transport 部分即可。
 *
 * 状态流转：
 *   本地文件： queued → hashing → checking ─┬→ instant（秒传，服务器已有相同文件）
 *                                          └→ uploading → verifying → done
 *   百度网盘： queued → fetching → verifying → done
 *   任意阶段可暂停（paused）/ 出错（error），恢复后从断点继续。
 */
export type Stage =
  | "queued"
  | "fetching"
  | "hashing"
  | "checking"
  | "uploading"
  | "verifying"
  | "done"
  | "instant"
  | "paused"
  | "error"

export interface UploadItem {
  id: string
  name: string
  size: number
  origin: FileOrigin
  path?: string
  file?: File
  stage: Stage
  /** 暂停前所处的阶段，恢复时回到这里 */
  resumeStage?: Stage
  chunksTotal: number
  hashed: number
  chunkHashes: string[]
  fingerprint?: string
  /** 已上传（或已从网盘拉取）的块数 */
  transferred: number
  retries: number
  lastRetryChunk?: number
  speed?: number
  error?: string
  /** 结果说明，例如“云盘里已有这个文件” */
  note?: string
}

const CONCURRENCY = 2
const MAX_RETRIES_PER_CHUNK = 3
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
let seq = 0

class Paused extends Error {}

export function useUploader() {
  const [items, setItems] = useState<UploadItem[]>([])
  const ref = useRef<UploadItem[]>([])
  const paused = useRef(new Set<string>())
  const running = useRef(new Set<string>())
  // 任务结束后要“再抽一个排队的任务”，用 ref 避免 pump 在自己的定义里引用自己
  const pumpRef = useRef<() => void>(() => {})

  const update = useCallback((id: string, patch: Partial<UploadItem>) => {
    ref.current = ref.current.map((it) => (it.id === id ? { ...it, ...patch } : it))
    setItems(ref.current)
  }, [])
  const get = (id: string) => ref.current.find((i) => i.id === id)!
  const checkPause = (id: string) => {
    if (paused.current.has(id)) throw new Paused()
  }

  const finish = useCallback((id: string, instant = false) => {
    const it = get(id)
    // 同名且内容相同：已经在云盘里了，不重复添加
    if (filesStore.read().some((f) => f.fingerprint === it.fingerprint && f.name === it.name)) {
      update(id, { stage: "instant", note: "云盘中已有同名且内容相同的文件，未重复保存" })
      return
    }
    filesStore.write((fs) => [
      {
        id: `f${Date.now().toString(36)}${seq++}`,
        name: it.name,
        size: it.size,
        fingerprint: it.fingerprint ?? "",
        origin: it.origin,
        path: it.path,
        uploadedAt: Date.now(),
        kb: "none",
      },
      ...fs,
    ])
    update(id, { stage: instant ? "instant" : "done" })
  }, [update])

  const runLocal = useCallback(async (id: string) => {
    let it = get(id)
    // ① 计算校验值（真实计算，可从已算好的块继续）
    if (!it.fingerprint) {
      update(id, { stage: "hashing" })
      const ctrl = new AbortController()
      const iv = setInterval(() => paused.current.has(id) && ctrl.abort(), 50)
      try {
        const { chunks, fingerprint } = await hashFile(
          it.file!,
          (done, _total, chunks) => update(id, { hashed: done, chunkHashes: chunks }),
          ctrl.signal,
          it.chunkHashes,
        )
        update(id, { chunkHashes: chunks, fingerprint, hashed: chunks.length })
      } catch (e) {
        if ((e as Error).name === "AbortError") throw new Paused()
        throw e
      } finally {
        clearInterval(iv)
      }
    }
    // ② 服务器查重：指纹已存在 → 秒传
    update(id, { stage: "checking" })
    await sleep(500)
    it = get(id)
    if (filesStore.read().some((f) => f.fingerprint === it.fingerprint)) return finish(id, true)

    // ③ 分块上传：每块带上它的哈希，服务器收到后核对，不一致就重传这一块
    update(id, { stage: "uploading" })
    for (let i = it.transferred; i < it.chunksTotal; i++) {
      checkPause(id)
      const bytes = Math.min(CHUNK_SIZE, it.size - i * CHUNK_SIZE)
      const speed = 18 + Math.random() * 14 // MB/s，演示
      let attempt = 0
      while (true) {
        await sleep(Math.max(60, (bytes / (speed * 1024 * 1024)) * 1000))
        // 演示：约 7% 的概率某块校验不一致，自动重传
        if (Math.random() < 0.07 && attempt < MAX_RETRIES_PER_CHUNK) {
          attempt++
          update(id, { retries: get(id).retries + 1, lastRetryChunk: i + 1 })
          continue
        }
        break
      }
      update(id, { transferred: i + 1, speed })
    }
    // ④ 合并后，服务器对整个文件重新计算指纹并比对
    update(id, { stage: "verifying" })
    await sleep(700)
    finish(id)
  }, [finish, update])

  const runBaidu = useCallback(async (id: string) => {
    const it = get(id)
    update(id, { stage: "fetching" })
    // 从百度网盘拉取：非会员限速，这里模拟约 6 MB/s
    for (let i = it.transferred; i < it.chunksTotal; i++) {
      checkPause(id)
      await sleep(Math.max(80, (Math.min(CHUNK_SIZE, it.size - i * CHUNK_SIZE) / (6 * 1024 * 1024)) * 1000))
      update(id, { transferred: i + 1, speed: 5 + Math.random() * 2 })
    }
    // 拉取完成后，用网盘提供的 MD5 与本地重新计算的结果比对
    update(id, { stage: "verifying" })
    await sleep(700)
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${it.path}/${it.name}:${it.size}`))
    update(id, {
      fingerprint: Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join(""),
    })
    finish(id)
  }, [finish, update])

  const pump = useCallback(() => {
    for (const it of ref.current) {
      if (running.current.size >= CONCURRENCY) break
      if (it.stage !== "queued" || running.current.has(it.id)) continue
      running.current.add(it.id)
      const job = it.origin === "baidu" ? runBaidu(it.id) : runLocal(it.id)
      job
        .catch((e) => {
          if (e instanceof Paused) update(it.id, { stage: "paused", resumeStage: get(it.id).stage })
          else update(it.id, { stage: "error", error: (e as Error).message || "未知错误" })
        })
        .finally(() => {
          running.current.delete(it.id)
          pumpRef.current()
        })
    }
  }, [runBaidu, runLocal, update])

  useEffect(() => {
    pumpRef.current = pump
  }, [pump])

  const add = useCallback(
    (entries: { name: string; size: number; file?: File; origin: FileOrigin; path?: string }[]) => {
      const next: UploadItem[] = entries.map((e) => ({
        ...e,
        id: `u${Date.now().toString(36)}${seq++}`,
        stage: "queued",
        chunksTotal: chunkCount(e.size),
        hashed: 0,
        chunkHashes: [],
        transferred: 0,
        retries: 0,
      }))
      ref.current = [...next, ...ref.current]
      setItems(ref.current)
      pump()
    },
    [pump],
  )

  const pause = (id: string) => paused.current.add(id)
  const resume = (id: string) => {
    paused.current.delete(id)
    update(id, { stage: "queued", error: undefined })
    pump()
  }
  const remove = (id: string) => {
    paused.current.add(id)
    ref.current = ref.current.filter((i) => i.id !== id)
    setItems(ref.current)
  }
  const clearFinished = () => {
    ref.current = ref.current.filter((i) => i.stage !== "done" && i.stage !== "instant")
    setItems(ref.current)
  }

  // 离开页面时停止所有任务（真实环境：已上传的块保存在服务器，下次可续传）
  useEffect(() => {
    const p = paused.current
    return () => ref.current.forEach((i) => p.add(i.id))
  }, [])

  return { items, add, pause, resume, remove, clearFinished }
}
