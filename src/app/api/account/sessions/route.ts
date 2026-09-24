import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/server/current-user"
import { endSession, getSession, listActiveSessions } from "@/lib/server/session"

/** 我的已登录设备：列出 / 让某台设备退出 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  return NextResponse.json(
    listActiveSessions(user.email).map((s) => ({
      sid: s.sid,
      device: s.device,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      current: s.sid === user.sid,
    })),
  )
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { sid } = await req.json().catch(() => ({}))
  const s = typeof sid === "string" ? getSession(sid) : undefined
  // 只能让自己的会话退出
  if (!s || s.email !== user.email) return NextResponse.json({ error: "找不到这个设备" }, { status: 404 })
  endSession(s.sid, "revoked")
  return NextResponse.json({ ok: true })
}
