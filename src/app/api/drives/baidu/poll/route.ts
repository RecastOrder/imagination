import { NextResponse } from "next/server"

import { holdDrive } from "@/lib/server/hold-library"
import { requireMyFiles } from "@/lib/server/my-files"

/** 百度网盘：等扫码（waiting / scanned / connected / expired）。hold 那边最多挂 40 秒等百度回话 */
export async function POST(req: Request) {
  const g = await requireMyFiles()
  if (g.error) return g.error
  const b = (await req.json().catch(() => ({}))) as { gid?: unknown }
  if (typeof b.gid !== "string" || !/^[0-9A-F-]{36}$/.test(b.gid)) return NextResponse.json({ error: "gid 不对" }, { status: 400 })
  const r = await holdDrive("POST", "/v1/drive/baidu/poll", g.user.email, { body: { gid: b.gid }, timeoutMs: 50000 })
  return NextResponse.json(r.body, { status: r.status })
}
