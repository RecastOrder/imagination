import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/server/current-user"
import { holdStream, isHoldId } from "@/lib/server/hold-library"

/** 规范 / 图集的原件 PDF（hold 上那一份，流式转发）。语料不对外：必须登录 */
export async function GET(_req: Request, { params }: RouteContext<"/api/sources/[id]/file">) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { id } = await params
  if (!isHoldId(id) || id.startsWith("hm-")) return NextResponse.json({ error: "没有原件" }, { status: 404 })
  return holdStream(`/v1/file/${id}`)
}
