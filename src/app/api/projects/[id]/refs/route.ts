import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/server/current-user"
import { addRef, listRefs, removeRef } from "@/lib/server/project-refs"
import { canEditContent, canView, getProject } from "@/lib/server/projects"

async function load(ctx: RouteContext<"/api/projects/[id]/refs">) {
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: "未登录" }, { status: 401 }) }
  const p = getProject((await ctx.params).id)
  if (!p || !canView(p, user.email)) return { error: NextResponse.json({ error: "项目不存在或无权查看" }, { status: 404 }) }
  return { user, p }
}

/** 依据清单：成员都能看 */
export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[id]/refs">) {
  const a = await load(ctx)
  if (a.error) return a.error
  return NextResponse.json(listRefs(a.p.id))
}

/** 加入：需要编辑权限（负责人 / 可编辑 / 管理员） */
export async function POST(req: Request, ctx: RouteContext<"/api/projects/[id]/refs">) {
  const a = await load(ctx)
  if (a.error) return a.error
  if (a.p.archivedAt) return NextResponse.json({ error: "项目已归档（只读）" }, { status: 409 })
  if (!canEditContent(a.p, a.user.email)) return NextResponse.json({ error: "你在这个项目里是“仅浏览”，不能加入内容" }, { status: 403 })
  const r = addRef(a.p.id, await req.json().catch(() => ({})), a.user.email)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json(r.ref)
}

/** 移除：?refId=，需要编辑权限 */
export async function DELETE(req: Request, ctx: RouteContext<"/api/projects/[id]/refs">) {
  const a = await load(ctx)
  if (a.error) return a.error
  if (a.p.archivedAt) return NextResponse.json({ error: "项目已归档（只读）" }, { status: 409 })
  if (!canEditContent(a.p, a.user.email)) return NextResponse.json({ error: "你在这个项目里是“仅浏览”，不能修改" }, { status: 403 })
  if (!removeRef(a.p.id, new URL(req.url).searchParams.get("refId") ?? "")) return NextResponse.json({ error: "条目不存在" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
