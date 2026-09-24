import { NextResponse } from "next/server"

import { normalizeEmail, verifyCode } from "@/lib/server/otp"
import { resolve } from "@/lib/auth/permissions"
import { homeFor } from "@/lib/server/guard"
import { findMember, markLogin } from "@/lib/server/members"
import { LAST_EMAIL_COOKIE, SESSION_COOKIE, createSession, sessionCookieOptions } from "@/lib/server/session"

const MESSAGES = {
  expired: "验证码已过期，请重新获取",
  wrong: "验证码不正确",
  too_many: "输错次数太多，请重新获取验证码",
  missing: "请先获取验证码",
} as const

/** 第 2 步：校验验证码，成功后写入登录 Cookie */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const email = normalizeEmail(body.email)
  const code = typeof body.code === "string" ? body.code.trim() : ""
  if (!email || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "请输入 6 位数字验证码" }, { status: 400 })

  const result = verifyCode(email, code)
  if (result !== "ok") return NextResponse.json({ error: MESSAGES[result], reason: result }, { status: 401 })

  // 新建会话；按设备策略，同类设备上之前的登录会自动退出
  const { token, replaced } = await createSession(email, req.headers.get("user-agent") ?? "")
  markLogin(email)
  const member = findMember(email)
  // home：这个人有权限的第一个页面（没有指定 next 时登录后去这里）
  const res = NextResponse.json({ ok: true, email, replaced, home: member ? homeFor(resolve(member)) : "/settings" })
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions)
  // 记住邮箱，下次登录页自动填好（不是登录凭证，只是便利）
  res.cookies.set(LAST_EMAIL_COOKIE, email, { ...sessionCookieOptions, maxAge: 60 * 60 * 24 * 365 })
  return res
}
