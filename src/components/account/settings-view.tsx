"use client"

import { CheckIcon, CloudIcon, LogOutIcon, MailIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CHAT_MODES, type ChatMode } from "@/lib/chat/modes"
import { cn } from "@/lib/utils"
import { useAccount } from "./account-provider"
import { DevicesSection } from "./devices-section"

/** 账户设置：账户信息 + 跟随账户保存的偏好 */
export function SettingsView() {
  const { email, name, roleLabel, prefs, setPref, logout } = useAccount()

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">账户设置</h1>

        <section className="mt-8 rounded-xl border bg-surface">
          <h2 className="border-b px-5 py-3 text-sm font-semibold">账户</h2>
          <dl className="divide-y text-sm">
            <div className="flex items-center gap-4 px-5 py-3">
              <dt className="w-20 shrink-0 text-muted-foreground">姓名</dt>
              <dd className="min-w-0 flex-1 truncate font-medium">{name}</dd>
            </div>
            <div className="flex items-center gap-4 px-5 py-3">
              <dt className="w-20 shrink-0 text-muted-foreground">角色</dt>
              <dd className="min-w-0 flex-1 truncate">{roleLabel}</dd>
            </div>
            <div className="flex items-center gap-4 px-5 py-3">
              <dt className="w-20 shrink-0 text-muted-foreground">邮箱</dt>
              <dd className="min-w-0 flex-1 truncate font-medium">{email}</dd>
            </div>
            <div className="flex items-center gap-4 px-5 py-3">
              <dt className="w-20 shrink-0 text-muted-foreground">登录方式</dt>
              <dd className="flex items-center gap-1.5">
                <MailIcon className="size-4 text-muted-foreground" />
                邮箱验证码（无需密码）
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-6 rounded-xl border bg-surface">
          <div className="border-b px-5 py-3">
            <h2 className="text-sm font-semibold">默认对话模式</h2>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <CloudIcon className="size-3.5" />
              保存在账户中，换电脑或浏览器登录也会沿用。在对话框里切换也会同步到这里。
            </p>
          </div>
          <div role="radiogroup" aria-label="默认对话模式" className="grid gap-3 p-5 sm:grid-cols-2">
            {(Object.keys(CHAT_MODES) as ChatMode[]).map((m) => {
              const { label, desc, icon: Icon } = CHAT_MODES[m]
              const on = prefs.chatMode === m
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPref("chatMode", m)}
                  className={cn(
                    "cursor-pointer rounded-lg border p-4 text-left transition-colors hover:border-border-strong",
                    on && "border-primary bg-primary-subtle/50 hover:border-primary",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className={cn("size-4 text-muted-foreground", on && "text-primary")} />
                    {label}
                    {on && <CheckIcon className="ml-auto size-4 text-primary" />}
                  </span>
                  <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">{desc}</span>
                </button>
              )
            })}
          </div>
        </section>

        <DevicesSection />

        <Button variant="outline" className="mt-8" onClick={logout}>
          <LogOutIcon />
          退出登录
        </Button>
      </div>
    </div>
  )
}
