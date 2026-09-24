import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { LoginView } from "@/components/account/login-view"
import { getCurrentUser } from "@/lib/server/current-user"
import { homeFor } from "@/lib/server/guard"
import { DEMO_SHOW_CODE } from "@/lib/server/otp"
import { LAST_EMAIL_COOKIE } from "@/lib/server/session"

export const metadata: Metadata = { title: "登录" }

/** 只允许跳回站内地址，防止被利用做钓鱼跳转（开放重定向漏洞） */
function safeNext(raw: string | string[] | undefined) {
  const v = Array.isArray(raw) ? raw[0] : raw
  return v && v.startsWith("/") && !v.startsWith("//") ? v : undefined
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams
  const next = safeNext(sp.next)
  const user = await getCurrentUser()
  if (user) redirect(next ?? homeFor(user.permissions))
  // 邮箱默认值：邀请链接里的 > 上次登录用的
  const email = one(sp.email) ?? (await cookies()).get(LAST_EMAIL_COOKIE)?.value ?? ""
  return <LoginView next={next} lastEmail={email} reason={one(sp.reason)} demo={DEMO_SHOW_CODE} />
}
