"use client"

import { useSyncExternalStore } from "react"
import { FlameIcon, MoonIcon, SnowflakeIcon, SunIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * 主题 = 两个独立开关（owner 2026-09-26「冷暖开关，白天黑夜开关」，共四种）：
 * - 冷暖：暖（默认，陶土色）/ 冷（青色，来自 Brain 三栏改版页的色系）→ <html class="cool">
 * - 日夜：白天 / 夜间 → <html class="dark">；从没选过时跟随系统
 * 各自存在 localStorage，互不影响。
 */
type Tone = "warm" | "cool"
type Mode = "light" | "dark"

const TONE_KEY = "tone"
const MODE_KEY = "theme"
const listeners = new Set<() => void>()

function readTone(): Tone {
  try {
    return localStorage.getItem(TONE_KEY) === "cool" ? "cool" : "warm"
  } catch {
    return "warm"
  }
}

function readMode(): Mode {
  try {
    const v = localStorage.getItem(MODE_KEY)
    if (v === "light" || v === "dark") return v
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  } catch {
    return "light"
  }
}

export function applyTheme() {
  const el = document.documentElement
  el.classList.toggle("dark", readMode() === "dark")
  el.classList.toggle("cool", readTone() === "cool")
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {}
  applyTheme()
  listeners.forEach((l) => l())
}

/** 首屏前执行，避免先显示错的颜色再跳变（放在 <head> 里） */
export const themeInitScript = `(function(){try{var e=document.documentElement;var t=localStorage.getItem('${MODE_KEY}');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)e.classList.add('dark');if(localStorage.getItem('${TONE_KEY}')==='cool')e.classList.add('cool')}catch(x){}})()`

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function useTheme() {
  const tone = useSyncExternalStore(subscribe, readTone, () => "warm" as Tone)
  const mode = useSyncExternalStore(subscribe, readMode, () => "light" as Mode)
  return { tone, mode }
}

const TONES = [
  { value: "warm", label: "暖色", icon: FlameIcon },
  { value: "cool", label: "冷色", icon: SnowflakeIcon },
] as const
const MODES = [
  { value: "light", label: "白天", icon: SunIcon },
  { value: "dark", label: "夜间", icon: MoonIcon },
] as const

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly { value: T; label: string; icon: typeof SunIcon }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex min-w-0 flex-1 rounded-md bg-sidebar-accent/60 p-0.5">
      {options.map(({ value: v, label: l, icon: Icon }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          aria-label={l}
          title={l}
          onClick={() => onChange(v)}
          className={cn(
            "flex h-7 flex-1 cursor-pointer items-center justify-center rounded-[5px] text-muted-foreground transition-colors",
            value === v && "bg-surface text-foreground shadow-sm",
          )}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  )
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { tone, mode } = useTheme()
  const setTone = (t: Tone) => save(TONE_KEY, t)
  const setMode = (m: Mode) => save(MODE_KEY, m)

  if (compact) {
    // 窄侧栏：两个按钮，各自点一下就切到另一档
    const T = TONES.find((o) => o.value === tone)!
    const M = MODES.find((o) => o.value === mode)!
    const btn =
      "flex size-9 cursor-pointer items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
    return (
      <>
        <button type="button" onClick={() => setTone(tone === "warm" ? "cool" : "warm")} className={btn} aria-label={`冷暖（当前：${T.label}）`} title={`冷暖：${T.label}`}>
          <T.icon className="size-4" />
        </button>
        <button type="button" onClick={() => setMode(mode === "light" ? "dark" : "light")} className={btn} aria-label={`日夜（当前：${M.label}）`} title={`日夜：${M.label}`}>
          <M.icon className="size-4" />
        </button>
      </>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 gap-1.5">
      <Segmented label="冷暖" options={TONES} value={tone} onChange={setTone} />
      <Segmented label="日夜" options={MODES} value={mode} onChange={setMode} />
    </div>
  )
}
