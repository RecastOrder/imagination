import { NextResponse } from "next/server"

import { holdDrive } from "@/lib/server/hold-library"
import { requireMyFiles } from "@/lib/server/my-files"

/** 我的「保存到服务器」任务（只看得到自己的） */
export async function GET() {
  const g = await requireMyFiles()
  if (g.error) return g.error
  const r = await holdDrive("GET", "/v1/drive/jobs", g.user.email)
  return NextResponse.json(r.body, { status: r.status, headers: { "cache-control": "private, no-store" } })
}
