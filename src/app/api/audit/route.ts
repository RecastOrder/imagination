import { NextResponse } from "next/server"

import { findNode, myTree, ownerOf } from "@/lib/drive/sample-tree"
import { covers } from "@/lib/drive/shares"
import { listAdminViews, logAdminView } from "@/lib/server/audit"
import { getCurrentUser } from "@/lib/server/current-user"
import { findMember, isAdmin } from "@/lib/server/members"
import { listSharedWith } from "@/lib/server/shares"

/** 查看记录：只有管理员能读 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  if (!isAdmin(user.email)) return NextResponse.json({ error: "需要管理员权限" }, { status: 403 })
  return NextResponse.json(listAdminViews())
}

/**
 * 记一笔：管理员以管理员身份打开了别人的个人文件。{ itemId }
 * 看自己的文件、或者文件本来就开放给了自己（普通权限），都不记。
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  if (!isAdmin(user.email)) return NextResponse.json({ error: "需要管理员权限" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const itemId = String(body.itemId ?? "")
  const owner = ownerOf(itemId)
  if (!owner || !findMember(owner)) return NextResponse.json({ error: "不是个人文件" }, { status: 400 })
  if (owner === user.email || listSharedWith(user.email).some((s) => covers(s, itemId))) return NextResponse.json({ logged: false })
  // 压缩包里的文件：按压缩包本身记
  const node = findNode(myTree(owner), itemId.split("!")[0])
  if (!node) return NextResponse.json({ error: "文件不存在" }, { status: 404 })
  const entry = logAdminView({ admin: user.email, owner, itemId, itemName: node.name })
  return NextResponse.json({ logged: !!entry })
}
