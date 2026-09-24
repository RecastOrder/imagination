"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, InfoIcon, LoaderCircleIcon, MailIcon } from "lucide-react"

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
export function LoginView({ next, lastEmail = "" }: { next: string; lastEmail?: string }) {
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
      router.replace(next)
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
              <h1 className="text-2xl font-semibold tracking-tight">登录</h1>
              <p className="mt-2 text-sm text-muted-foreground">输入你的邮箱，我们会发送一个 6 位验证码。第一次使用会自动创建账户。</p>
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
                {pending ? "发送中…" : "获取验证码"}
              </Button>
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
                  <span className="inline-flex items-center gap-1.5 text-success">
                    <LoaderCircleIcon className="size-4 animate-spin" />
                    登录成功，正在进入…
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
