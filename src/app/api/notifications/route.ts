import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/server/current-user"
import { listNotifications, markRead } from "@/lib/server/notifications"

/** 我的通知（最近 50 条 + 未读数） */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  return NextResponse.json(listNotifications(user.email))
}

/** 标为已读：{ ids?: string[] }，不传 ids = 全部已读 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  markRead(user.email, Array.isArray(body.ids) ? body.ids.map(String) : undefined)
  return NextResponse.json(listNotifications(user.email))
}
