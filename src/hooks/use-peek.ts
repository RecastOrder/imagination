"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

/**
 * “预览面板”的开关状态放在 URL 里（?peek=资料id&sec=段落id），而不是组件内部 state。
 * 好处：
 * 1. 浏览器“后退”键就能关闭面板，符合用户直觉；
 * 2. 链接可以分享，别人打开看到同一份资料；
 * 3. 对话页、资料库页共用同一套逻辑，面板组件完全不用关心自己在哪个页面。
 */
export function usePeek() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const peekId = params.get("peek")
  const sectionId = params.get("sec")

  const build = useCallback(
    (id: string | null, sec?: string) => {
      const next = new URLSearchParams(params.toString())
      if (id) next.set("peek", id)
      else next.delete("peek")
      if (id && sec) next.set("sec", sec)
      else next.delete("sec")
      const s = next.toString()
      return s ? `${pathname}?${s}` : pathname
    },
    [params, pathname],
  )

  const openPeek = useCallback(
    (id: string, sec?: string) => {
      // 已打开时切换资料用 replace，避免“后退”要按很多次
      const url = build(id, sec)
      if (peekId) router.replace(url, { scroll: false })
      else router.push(url, { scroll: false })
    },
    [build, peekId, router],
  )

  const closePeek = useCallback(() => router.replace(build(null), { scroll: false }), [build, router])

  return { peekId, sectionId, openPeek, closePeek }
}
