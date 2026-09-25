import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/server/current-user"
import { sourcesRepo } from "@/lib/server/sources-repo"

/** 资料列表（元信息，不含正文）。语料不对外：必须登录 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  return NextResponse.json(sourcesRepo().list(), { headers: { "Cache-Control": "private, max-age=300" } })
}
