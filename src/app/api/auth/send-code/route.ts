import { NextResponse } from "next/server"

import { findMember } from "@/lib/server/members"
import { DEMO_SHOW_CODE, issueCode, normalizeEmail, sendCodeEmail } from "@/lib/server/otp"

/** 第 1 步：发送邮箱验证码 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const email = normalizeEmail(body.email)
  if (!email) return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 })

  // 邀请制：只有成员名单里的邮箱才能收到验证码
  const member = findMember(email)
  if (!member) {
    return NextResponse.json(
      { error: "这个邮箱还没有受到邀请。本平台采用邀请制，请联系管理员用你的工作单位邮箱邀请你", reason: "not_invited" },
      { status: 403 },
    )
  }
  if (member.status === "disabled") {
    return NextResponse.json({ error: "这个账号已被停用，如有疑问请联系管理员", reason: "disabled" }, { status: 403 })
  }

  const r = issueCode(email)
  if (!r.ok) {
    return NextResponse.json({ error: `发送太频繁，请 ${r.retryAfter} 秒后再试`, retryAfter: r.retryAfter }, { status: 429 })
  }
  await sendCodeEmail(email, r.code)
  return NextResponse.json({ ok: true, retryAfter: 60, ...(DEMO_SHOW_CODE ? { demoCode: r.code } : {}) })
}
