import { NextResponse } from "next/server"

import { addRound } from "@/lib/server/condition-rounds"
import { getCurrentUser } from "@/lib/server/current-user"
import { canEditContent, canManage, canView, getProject, patchNeeds, updateProject, type ProjectPatch } from "@/lib/server/projects"

export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const p = getProject((await ctx.params).id)
  if (!p || !canView(p, user.email)) return NextResponse.json({ error: "项目不存在或无权查看" }, { status: 404 })
  return NextResponse.json(p)
}

/**
 * 修改项目。按改动内容分两级校验：
 * - 只改指标：负责人、可编辑成员、管理员
 * - 位置、阶段、成员及其权限：只有负责人和管理员
 */
export async function PATCH(req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const p = getProject((await ctx.params).id)
  if (!p || !canView(p, user.email)) return NextResponse.json({ error: "项目不存在或无权查看" }, { status: 404 })
  const patch: ProjectPatch = await req.json().catch(() => ({}))
  if (p.archivedAt && Object.keys(patch).some((k) => k !== "archived"))
    return NextResponse.json({ error: "项目已归档（只读）。需要修改请先恢复" }, { status: 409 })
  if (patchNeeds(patch) === "manage" ? !canManage(p, user.email) : !canEditContent(p, user.email))
    return NextResponse.json(
      { error: patchNeeds(patch) === "manage" ? "只有项目负责人可以修改项目信息和成员权限" : "你在这个项目里是“仅浏览”，不能修改" },
      { status: 403 },
    )
  const r = updateProject(p.id, patch, user.email)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  // 规划条件每确认保存一次算一轮，永久保留
  if (patch.conditions) addRound(r.project, r.project.conditions, user.email, patch.conditionsNote)
  return NextResponse.json(r.project)
}
