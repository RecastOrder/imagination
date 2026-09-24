"use client"

import { useSyncExternalStore } from "react"
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type Theme = "light" | "dark" | "system"
const KEY = "theme"
const listeners = new Set<() => void>()

function readTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === "light" || v === "dark" ? v : "system"
  } catch {
    return "system"
  }
}

export function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  document.documentElement.classList.toggle("dark", dark)
}

function setTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, theme)
  } catch {}
  applyTheme(theme)
  listeners.forEach((l) => l())
}

/** 首屏前执行，避免“先白后黑”的闪烁（放在 <head> 里） */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${KEY}');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`

const OPTIONS: { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: "light", label: "浅色", icon: SunIcon },
  { value: "dark", label: "深色", icon: MoonIcon },
  { value: "system", label: "跟随系统", icon: MonitorIcon },
]

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    readTheme,
    () => "system" as Theme,
  )

  if (compact) {
    const next = OPTIONS[(OPTIONS.findIndex((o) => o.value === theme) + 1) % OPTIONS.length]
    const Current = OPTIONS.find((o) => o.value === theme)!.icon
    return (
      <button
        type="button"
        onClick={() => setTheme(next.value)}
        className="flex size-9 cursor-pointer items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
        aria-label={`切换主题（当前：${OPTIONS.find((o) => o.value === theme)!.label}）`}
      >
        <Current className="size-4" />
      </button>
    )
  }

  return (
    <div role="radiogroup" aria-label="主题" className="flex rounded-md bg-sidebar-accent/60 p-0.5">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            "flex h-7 flex-1 cursor-pointer items-center justify-center rounded-[5px] text-muted-foreground transition-colors",
            theme === value && "bg-surface text-foreground shadow-sm",
          )}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  )
}
