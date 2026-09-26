import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/server/current-user"
import { holdStream } from "@/lib/server/hold-library"

/** 媒体报道里的第 n 张图（hold 上已取回的那一份）。语料不对外：必须登录 */
export async function GET(_req: Request, { params }: RouteContext<"/api/sources/[id]/asset/[n]">) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { id, n } = await params
  if (!/^hm-[0-9a-f]{16}$/.test(id) || !/^\d{1,4}$/.test(n)) return NextResponse.json({ error: "没有这张图" }, { status: 404 })
  return holdStream(`/v1/asset/${id}/${n}`)
}
