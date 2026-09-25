import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/server/current-user"
import { createProject, listProjectsFor } from "@/lib/server/projects"

/** 我能看到的项目 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  return NextResponse.json(listProjectsFor(user.email))
}

/** 新建项目：需要“新建项目”权限（管理员，或管理员单独打开了这项权限的人） */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  if (!user.permissions.features.project_create.on) {
    return NextResponse.json({ error: "你没有新建项目的权限，请联系管理员" }, { status: 403 })
  }
  const r = createProject(await req.json().catch(() => ({})), user.email)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json(r.project)
}
