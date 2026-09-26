import { NextResponse } from "next/server"

import { holdDrive } from "@/lib/server/hold-library"
import { requireMyFiles } from "@/lib/server/my-files"

/** 我连了哪些网盘（不含任何凭据；凭据只在 hold 上，加密存放） */
export async function GET() {
  const g = await requireMyFiles()
  if (g.error) return g.error
  const r = await holdDrive("GET", "/v1/drive/list", g.user.email)
  return NextResponse.json(r.body, { status: r.status })
}
