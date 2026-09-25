import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/server/current-user"
import { getPrefs, updatePrefs } from "@/lib/server/prefs"

/** 账户偏好：读取 / 修改。必须登录（服务端再校验一次，不依赖页面隐藏） */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  return NextResponse.json(getPrefs(user.email))
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  if (body?.viewAsMember === true && !user.realAdmin) {
    return NextResponse.json({ error: "只有管理员可以切换对比视角" }, { status: 403 })
  }
  return NextResponse.json(updatePrefs(user.email, body, { realAdmin: user.realAdmin }))
}
