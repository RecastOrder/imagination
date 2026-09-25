import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/server/current-user"
import { checkMentions, fileAccess } from "@/lib/server/file-access"
import { notifyMentions } from "@/lib/server/notifications"
import { getIssue, replyIssue, setIssueStatus } from "@/lib/server/issues"

async function load(ctx: RouteContext<"/api/issues/[id]">) {
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: "未登录" }, { status: 401 }) }
  const issue = getIssue((await ctx.params).id)
  const access = issue ? fileAccess(user.email, issue.fileId) : null
  if (!issue || !access) return { error: NextResponse.json({ error: "问题不存在或无权查看" }, { status: 404 }) }
  return { user, issue, access }
}

/** 回复：{ text }。能看这个文件的人都能回复（包括仅浏览） */
export async function POST(req: Request, ctx: RouteContext<"/api/issues/[id]">) {
  const a = await load(ctx)
  if (a.error) return a.error
  const body = await req.json().catch(() => ({}))
  const m = checkMentions(a.issue.fileId, body.mentions, a.user.email)
  if (!m.ok) return NextResponse.json({ error: m.error }, { status: 400 })
  const r = replyIssue(a.issue.id, a.user.email, body.text)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  await notifyMentions({
    mentions: m.mentions,
    everyone: m.everyone,
    from: a.user.email,
    issueLabel: `#${r.issue.number}`,
    fileName: r.issue.fileName,
    text: String(body.text ?? "").trim(),
    href: `/browse?f=${encodeURIComponent(r.issue.fileId)}&issue=${r.issue.id}`,
    origin: process.env.APP_URL ?? new URL(req.url).origin,
  })
  return NextResponse.json(r.issue)
}

/** 关闭 / 重新打开：{ status }。需要编辑权限，或者是发起人自己 */
export async function PATCH(req: Request, ctx: RouteContext<"/api/issues/[id]">) {
  const a = await load(ctx)
  if (a.error) return a.error
  if (a.access !== "edit" && a.issue.author !== a.user.email) return NextResponse.json({ error: "你对这个文件是“仅浏览”，不能关闭问题" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const r = setIssueStatus(a.issue.id, body.status, a.user.email)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json(r.issue)
}
