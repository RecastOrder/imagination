"use client"

import { useCallback, useEffect, useState } from "react"
import { LaptopIcon, SmartphoneIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"

interface DeviceSession {
  sid: string
  device: "mobile" | "desktop"
  userAgent: string
  createdAt: number
  lastSeenAt: number
  current: boolean
}

/** 从浏览器标识里粗略读出“浏览器 · 系统”，给人看的，不用于安全判断 */
function describe(ua: string) {
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "浏览器"
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /HarmonyOS/.test(ua) ? "鸿蒙" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "未知系统"
  return `${browser} · ${os}`
}

const fmt = (t: number) => new Date(t).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" })

/**
 * 已登录的设备：规则是“1 台电脑 + 1 台手机”，同类设备上新登录会挤掉旧的。
 * 用户也可以在这里手动让某台设备退出（比如手机丢了）。
 */
export function DevicesSection() {
  const [list, setList] = useState<DeviceSession[] | null>(null)

  const load = useCallback(async () => {
    const r = await fetch("/api/account/sessions")
    if (r.ok) setList(await r.json())
  }, [])

  useEffect(() => {
    let alive = true
    fetch("/api/account/sessions")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setList(d))
    return () => {
      alive = false
    }
  }, [])

  const slots: { type: DeviceSession["device"]; label: string; icon: typeof LaptopIcon }[] = [
    { type: "desktop", label: "电脑", icon: LaptopIcon },
    { type: "mobile", label: "手机", icon: SmartphoneIcon },
  ]

  return (
    <section className="mt-6 rounded-xl border bg-surface">
      <div className="border-b px-5 py-3">
        <h2 className="text-sm font-semibold">已登录的设备</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          每个账号同时最多 1 台电脑 + 1 台手机。在同类设备上登录，之前那台会自动退出。
        </p>
      </div>
      {list === null ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <ul className="divide-y">
          {slots.map(({ type, label, icon: Icon }) => {
            const s = list.find((x) => x.device === type)
            return (
              <li key={type} className="flex items-center gap-3 px-5 py-3">
                <Icon className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm">
                    {label}
                    {s?.current && <span className="rounded-sm bg-primary-subtle px-1.5 py-0.5 text-xs text-primary-subtle-foreground">本设备</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s ? `${describe(s.userAgent)} · 登录于 ${fmt(s.createdAt)} · 最近活动 ${fmt(s.lastSeenAt)}` : "未登录"}
                  </p>
                </div>
                {s && !s.current && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const r = await fetch("/api/account/sessions", {
                        method: "DELETE",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ sid: s.sid }),
                      })
                      if (r.ok) {
                        toast(`已让${label}退出登录`)
                        load()
                      } else toast("操作失败，请重试")
                    }}
                  >
                    退出该设备
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
