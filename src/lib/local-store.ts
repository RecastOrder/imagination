/**
 * 极简的本地存储仓库（演示阶段替代后端）。
 * 接入账户系统后，把 read/write 换成调用服务端接口即可，使用它的组件不用改。
 */
type Listener = () => void

export function createLocalStore<T>(key: string, fallback: T) {
  const listeners = new Set<Listener>()
  let cache: T | undefined

  const read = (): T => {
    if (cache !== undefined) return cache
    try {
      const raw = localStorage.getItem(key)
      cache = raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      cache = fallback
    }
    return cache
  }

  const write = (next: T | ((prev: T) => T)) => {
    cache = typeof next === "function" ? (next as (p: T) => T)(read()) : next
    try {
      localStorage.setItem(key, JSON.stringify(cache))
    } catch {}
    listeners.forEach((l) => l())
  }

  const subscribe = (l: Listener) => {
    listeners.add(l)
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        cache = undefined
        l()
      }
    }
    window.addEventListener("storage", onStorage)
    return () => {
      listeners.delete(l)
      window.removeEventListener("storage", onStorage)
    }
  }

  return { read, write, subscribe, fallback }
}

export type LocalStore<T> = ReturnType<typeof createLocalStore<T>>
