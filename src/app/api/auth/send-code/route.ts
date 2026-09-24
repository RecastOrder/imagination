import { NextResponse } from "next/server"

import { DEMO_SHOW_CODE, issueCode, normalizeEmail, sendCodeEmail } from "@/lib/server/otp"

/** 第 1 步：发送邮箱验证码 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const email = normalizeEmail(body.email)
  if (!email) return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 })

  const r = issueCode(email)
  if (!r.ok) {
    return NextResponse.json({ error: `发送太频繁，请 ${r.retryAfter} 秒后再试`, retryAfter: r.retryAfter }, { status: 429 })
  }
  await sendCodeEmail(email, r.code)
  return NextResponse.json({ ok: true, retryAfter: 60, ...(DEMO_SHOW_CODE ? { demoCode: r.code } : {}) })
}
