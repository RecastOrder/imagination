import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/server/current-user"
import { checkMentions, fileAccess, issueScope, mentionable } from "@/lib/server/file-access"
import { notifyMentions } from "@/lib/server/notifications"
import { listIssuesForFile, listIssuesInScope, raiseIssue } from "@/lib/server/issues"
import { canView, getProject } from "@/lib/server/projects"

/** 列出问题：?fileId=（能看这个文件的人）或 ?projectId=（项目成员）；?fileId=…&mentionable=1 返回可以 @ 的人 */
export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const q = new URL(req.url).searchParams
  const fileId = q.get("fileId")
  const projectId = q.get("projectId")
  if (fileId) {
    if (!fileAccess(user.email, fileId)) return NextResponse.json({ error: "无权查看这个文件" }, { status: 404 })
    if (q.get("mentionable")) return NextResponse.json(mentionable(fileId, user.email))
    return NextResponse.json(listIssuesForFile(fileId))
  }
  if (projectId) {
    const p = getProject(projectId)
    if (!p || !canView(p, user.email)) return NextResponse.json({ error: "项目不存在或无权查看" }, { status: 404 })
    return NextResponse.json(listIssuesInScope(`proj:${p.id}`))
  }
  return NextResponse.json({ error: "缺少 fileId 或 projectId" }, { status: 400 })
}

/** 发起问题：{ fileId, fileName, mark, scale?, title }。需要这个文件的编辑权限 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const fileId = String(body.fileId ?? "")
  const access = fileAccess(user.email, fileId)
  const scope = issueScope(fileId)
  if (!access || !scope) return NextResponse.json({ error: "无权查看这个文件" }, { status: 404 })
  if (access !== "edit") return NextResponse.json({ error: "你对这个文件是“仅浏览”，不能发起问题，可以在已有问题下回复" }, { status: 403 })
  const m = checkMentions(fileId, body.mentions)
  if (!m.ok) return NextResponse.json({ error: m.error }, { status: 400 })
  const r = raiseIssue({ scope, fileId, fileName: body.fileName, mark: body.mark, scale: body.scale, title: body.title, author: user.email })
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  await notifyMentions({
    mentions: m.mentions,
    from: user.email,
    issueLabel: `#${r.issue.number}`,
    fileName: r.issue.fileName,
    text: r.issue.title,
    href: `/browse?f=${encodeURIComponent(fileId)}&issue=${r.issue.id}`,
    origin: process.env.APP_URL ?? new URL(req.url).origin,
  })
  return NextResponse.json(r.issue)
}
