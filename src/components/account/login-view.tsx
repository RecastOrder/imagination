"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, InfoIcon, LoaderCircleIcon, LogOutIcon, MailIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OtpInput } from "@/components/ui/otp-input"
import { Logo } from "@/components/shell/logo"

/**
 * 邮箱验证码登录：两步。
 *   ① 输入邮箱 → 获取验证码
 *   ② 输入 6 位验证码（输满自动提交）→ 进入原来要去的页面
 * 没有密码：不用记、不会泄露；邮箱本身就是身份。
 */
const REASONS: Record<string, string> = {
  replaced: "你的账号在另一台同类设备上登录了，这台设备已自动退出。每个账号同时只能在 1 台电脑和 1 台手机上登录。",
  disabled: "你的账号已被管理员停用。",
  revoked: "这台设备已被退出登录。",
  expired: "登录已过期（30 天），请重新登录。",
}

/** 演示环境预置的成员（邀请制：只有名单里的邮箱能登录） */
const DEMO_ACCOUNTS = [
  { email: "zhang.ming@studio.cn", label: "张明 · 管理员" },
  { email: "li.na@studio.cn", label: "李娜 · 标准成员" },
]

export function LoginView({
  next,
  lastEmail = "",
  reason,
  demo,
}: {
  /** 登录后要回到的页面；没有时去“这个人有权限的第一个页面” */
  next?: string
  /** 邀请链接里带的邮箱，或上次登录用的邮箱 */
  lastEmail?: string
  reason?: string
  demo?: boolean
}) {
  const router = useRouter()
  const [step, setStep] = useState<"email" | "code">("email")
  // 上次登录用的邮箱由服务端从 Cookie 读出来传入（只是便利功能）
  const [email, setEmail] = useState(lastEmail)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [demoCode, setDemoCode] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [replacedNote, setReplacedNote] = useState<string | null>(null)

  // 重发倒计时
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const sendCode = async () => {
    setPending(true)
    setError(null)
    try {
      const r = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await r.json()
      if (data.retryAfter) setCooldown(data.retryAfter)
      if (!r.ok) {
        setError(data.error ?? "发送失败，请稍后再试")
        return
      }
      setDemoCode(data.demoCode ?? null)
      setCode("")
      setStep("code")
    } catch {
      setError("网络连接失败，请检查网络后重试")
    } finally {
      setPending(false)
    }
  }

  const verify = async (value: string) => {
    setPending(true)
    setError(null)
    try {
      const r = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code: value }),
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error ?? "验证失败")
        if (data.reason === "too_many" || data.reason === "expired") setCooldown(0)
        return
      }
      setDone(true)
      if (data.replaced?.length) {
        // 告诉用户：同类设备上之前的登录已退出，停留片刻让人看清
        setReplacedNote(`之前在另一台${data.replaced[0] === "mobile" ? "手机" : "电脑"}上的登录已自动退出`)
        await new Promise((r) => setTimeout(r, 1500))
      }
      router.replace(next ?? data.home ?? "/chat")
      router.refresh()
    } catch {
      setError("网络连接失败，请检查网络后重试")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center px-4 sm:px-6">
        <Link href="/" className="text-[15px]">
          <Logo />
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pt-[12vh] pb-16">
        <div className="w-full max-w-sm">
          {step === "email" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                sendCode()
              }}
            >
              {reason && REASONS[reason] && (
                <p role="status" className="mb-6 flex gap-2 rounded-lg bg-surface-sunken px-3 py-2.5 text-sm">
                  <LogOutIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {REASONS[reason]}
                </p>
              )}
              <h1 className="text-2xl font-semibold tracking-tight">登录</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                使用受邀的工作单位邮箱登录，我们会发送 6 位验证码，无需密码。
              </p>
              <label htmlFor="email" className="mt-8 block text-sm font-medium">
                邮箱
              </label>
              <div className="relative mt-2">
                <MailIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  aria-invalid={!!error || undefined}
                  aria-describedby={error ? "login-error" : undefined}
                  className="h-11 pl-9"
                />
              </div>
              {error && (
                <p id="login-error" role="alert" className="mt-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" size="lg" className="mt-6 w-full" disabled={pending || !email.trim()}>
                {pending && <LoaderCircleIcon className="animate-spin" />}
                {pending ? "发送验证码中…" : "登录"}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">本平台采用邀请制。还没有账号？请联系你所在单位的管理员</p>
              {demo && (
                <div className="mt-8 rounded-lg border border-dashed p-3 text-sm">
                  <p className="text-muted-foreground">演示环境的成员账号，点击填入：</p>
                  <div className="mt-2 flex flex-col items-start gap-1">
                    {DEMO_ACCOUNTS.map((a) => (
                      <button
                        key={a.email}
                        type="button"
                        onClick={() => {
                          setEmail(a.email)
                          setError(null)
                        }}
                        className="cursor-pointer font-mono text-[13px] hover:text-primary"
                      >
                        {a.email} <span className="font-sans text-xs text-muted-foreground">{a.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => {
                  setStep("email")
                  setError(null)
                }}
                className="-ml-1 inline-flex cursor-pointer items-center gap-1 rounded-md px-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeftIcon className="size-4" />
                修改邮箱
              </button>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">输入验证码</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                已发送至 <span className="font-medium text-foreground">{email}</span>，10 分钟内有效。
              </p>

              <div className="mt-8">
                <OtpInput
                  value={code}
                  autoFocus
                  invalid={!!error}
                  disabled={pending || done}
                  onChange={(v) => {
                    setCode(v)
                    setError(null)
                    if (v.length === 6) verify(v)
                  }}
                />
              </div>

              <div className="mt-3 min-h-5 text-sm" aria-live="polite">
                {done ? (
                  <span className="flex flex-col gap-1">
                    <span className="inline-flex items-center gap-1.5 text-success">
                      <LoaderCircleIcon className="size-4 animate-spin" />
                      登录成功，正在进入…
                    </span>
                    {replacedNote && <span className="text-muted-foreground">{replacedNote}</span>}
                  </span>
                ) : pending ? (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <LoaderCircleIcon className="size-4 animate-spin" />
                    验证中…
                  </span>
                ) : error ? (
                  <span role="alert" className="text-destructive">
                    {error}
                  </span>
                ) : null}
              </div>

              <p className="mt-6 text-sm text-muted-foreground">
                没收到？先看看垃圾邮件箱。{" "}
                {cooldown > 0 ? (
                  <span className="tabular-nums">{cooldown} 秒后可重新发送</span>
                ) : (
                  <button type="button" onClick={sendCode} disabled={pending} className="cursor-pointer font-medium text-primary hover:underline">
                    重新发送
                  </button>
                )}
              </p>

              {demoCode && (
                <div className="mt-8 flex gap-2.5 rounded-lg border border-dashed p-3 text-sm">
                  <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">演示环境尚未接入邮件服务，本次验证码是：</p>
                    <button
                      type="button"
                      onClick={() => {
                        setCode(demoCode)
                        verify(demoCode)
                      }}
                      className="mt-1 cursor-pointer font-mono text-lg font-semibold tracking-[0.3em] hover:text-primary"
                      title="点击自动填入"
                    >
                      {demoCode}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
