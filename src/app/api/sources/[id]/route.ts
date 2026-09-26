import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/server/current-user"
import { holdGet, isHoldId } from "@/lib/server/hold-library"
import { sourcesRepo } from "@/lib/server/sources-repo"

/** 一份资料的全文（预览面板用）。语料不对外：必须登录 */
export async function GET(_req: Request, { params }: RouteContext<"/api/sources/[id]">) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { id } = await params
  const source = isHoldId(id) ? await holdGet(id) : sourcesRepo().get(id)
  if (!source) return NextResponse.json({ error: "没有这份资料" }, { status: 404 })
  return NextResponse.json(source, { headers: { "Cache-Control": "private, max-age=300" } })
}
