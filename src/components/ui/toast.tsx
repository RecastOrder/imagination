"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { CheckCircle2Icon } from "lucide-react"

/**
 * 轻提示（Toast）：操作完成后在底部出现 3 秒，可以带一个“去看看”的链接。
 * 只用于“成功 / 已完成”这类不需要用户处理的消息；错误要留在原位显示。
 */
interface ToastItem {
  id: number
  text: string
  href?: string
  linkLabel?: string
}

let items: ToastItem[] = []
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
let seq = 0

export function toast(text: string, opts?: { href?: string; linkLabel?: string }) {
  const id = ++seq
  items = [...items, { id, text, ...opts }]
  emit()
  setTimeout(() => {
    items = items.filter((t) => t.id !== id)
    emit()
  }, 3200)
}

export function Toaster() {
  const list = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => items,
    () => items,
  )
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4">
      {list.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-2.5 rounded-lg bg-foreground px-4 py-2.5 text-sm text-background shadow-float animate-in fade-in-0 slide-in-from-bottom-2"
        >
          <CheckCircle2Icon className="size-4 shrink-0" />
          <span>{t.text}</span>
          {t.href && (
            <Link href={t.href} className="ml-2 font-medium underline underline-offset-2">
              {t.linkLabel ?? "查看"}
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}
