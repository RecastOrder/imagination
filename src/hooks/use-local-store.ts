"use client"

import { useSyncExternalStore } from "react"

import type { LocalStore } from "@/lib/local-store"

/** 订阅一个本地存储仓库：任何地方写入，所有用到它的组件都会更新（包括其他标签页） */
export function useLocalStore<T>(store: LocalStore<T>): [T, LocalStore<T>["write"]] {
  const value = useSyncExternalStore(store.subscribe, store.read, () => store.fallback)
  return [value, store.write]
}
