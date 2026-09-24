import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/server/current-user"
import { grantShare, listSharedWith, listSharesBy, revokeShare, setShareLevel } from "@/lib/server/shares"

/** 我共享出去的 + 共享给我的 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  return NextResponse.json({ byMe: listSharesBy(user.email), withMe: listSharedWith(user.email) })
}

/** 共享：{ itemId, grantee, level }。只能共享自己的文件（服务端按 itemId 校验主人） */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const r = grantShare({ owner: user.email, itemId: String(body.itemId ?? ""), grantee: String(body.grantee ?? "").trim().toLowerCase(), level: body.level })
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
  return NextResponse.json(r.share)
}

/** 改档位：{ id, level } */
export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const r = setShareLevel(String(body.id ?? ""), body.level, user.email)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
  return NextResponse.json(r.share)
}

/** 取消共享：?id= */
export async function DELETE(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const r = revokeShare(new URL(req.url).searchParams.get("id") ?? "", user.email)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
  return NextResponse.json({ ok: true })
}
