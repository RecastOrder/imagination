import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/server/current-user"
import { SESSION_COOKIE, endSession } from "@/lib/server/session"

/** 退出登录：服务器端让会话作废，再清掉 Cookie */
export async function POST() {
  const user = await getCurrentUser()
  if (user) endSession(user.sid, "signed_out")
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(SESSION_COOKIE)
  return res
}
