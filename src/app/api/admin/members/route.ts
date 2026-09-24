import { NextResponse } from "next/server"

import type { RoleId } from "@/lib/auth/permissions"
import { getCurrentUser } from "@/lib/server/current-user"
import { inviteMember, isAdmin, listMembers, revokeInvite, updateMember } from "@/lib/server/members"
import { normalizeEmail } from "@/lib/server/otp"

/** 管理员接口：每个方法都先在服务端确认“当前用户是管理员” */
async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: "未登录" }, { status: 401 }) }
  if (!isAdmin(user.email)) return { error: NextResponse.json({ error: "需要管理员权限" }, { status: 403 }) }
  return { user }
}

export async function GET() {
  const a = await requireAdmin()
  if (a.error) return a.error
  return NextResponse.json(listMembers())
}

/** 邀请成员 */
export async function POST(req: Request) {
  const a = await requireAdmin()
  if (a.error) return a.error
  const body = await req.json().catch(() => ({}))
  const email = normalizeEmail(body.email)
  if (!email) return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 })
  const r = inviteMember({ email, name: body.name, role: (body.role as RoleId) ?? "standard", invitedBy: a.user.email })
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  // 演示：不真正发送邀请邮件，返回登录链接（打开后邮箱已填好）
  return NextResponse.json({ member: r.member, inviteLink: `/login?email=${encodeURIComponent(email)}` })
}

/** 修改成员（角色、单独调整、停用） */
export async function PATCH(req: Request) {
  const a = await requireAdmin()
  if (a.error) return a.error
  const body = await req.json().catch(() => ({}))
  if (body.email === a.user.email && (body.status === "disabled" || (body.role && body.role !== "admin"))) {
    return NextResponse.json({ error: "不能停用自己或取消自己的管理员身份" }, { status: 400 })
  }
  const m = typeof body.email === "string" ? updateMember(body.email, body) : null
  if (!m) return NextResponse.json({ error: "找不到这个成员" }, { status: 404 })
  return NextResponse.json(m)
}

/** 撤销尚未登录过的邀请 */
export async function DELETE(req: Request) {
  const a = await requireAdmin()
  if (a.error) return a.error
  const { email } = await req.json().catch(() => ({}))
  if (!revokeInvite(email)) return NextResponse.json({ error: "只能撤销还未登录过的邀请" }, { status: 400 })
  return NextResponse.json({ ok: true })
}
