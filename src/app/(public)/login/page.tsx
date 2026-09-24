import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { LoginView } from "@/components/account/login-view"
import { getCurrentUser } from "@/lib/server/current-user"
import { LAST_EMAIL_COOKIE } from "@/lib/server/session"

export const metadata: Metadata = { title: "登录" }

/** 只允许跳回站内地址，防止被利用做钓鱼跳转（开放重定向漏洞） */
function safeNext(raw: string | string[] | undefined) {
  const v = Array.isArray(raw) ? raw[0] : raw
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/chat"
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next)
  if (await getCurrentUser()) redirect(next)
  const lastEmail = (await cookies()).get(LAST_EMAIL_COOKIE)?.value ?? ""
  return <LoginView next={next} lastEmail={lastEmail} />
}
