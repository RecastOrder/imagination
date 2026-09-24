import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/server/current-user"
import { canEdit, canView, getProject, updateProject } from "@/lib/server/projects"

export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const p = getProject((await ctx.params).id)
  if (!p || !canView(p, user.email)) return NextResponse.json({ error: "项目不存在或无权查看" }, { status: 404 })
  return NextResponse.json(p)
}

/** 修改项目：位置、阶段、指标、成员。只有项目负责人和管理员可以改 */
export async function PATCH(req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const p = getProject((await ctx.params).id)
  if (!p || !canView(p, user.email)) return NextResponse.json({ error: "项目不存在或无权查看" }, { status: 404 })
  if (!canEdit(p, user.email)) return NextResponse.json({ error: "只有项目负责人可以修改项目信息和成员" }, { status: 403 })
  const r = updateProject(p.id, await req.json().catch(() => ({})))
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json(r.project)
}
