import { NextResponse } from "next/server"

import { holdDrive } from "@/lib/server/hold-library"
import { requireMyFiles } from "@/lib/server/my-files"

/** 百度网盘实时列一层目录（owner 2026-09-27「连接之后就是实时挂载的网盘」）。?path=/…（与「我的文件」列目录同一种回包） */
export async function GET(req: Request) {
  const g = await requireMyFiles()
  if (g.error) return g.error
  const path = new URL(req.url).searchParams.get("path") || "/"
  const r = await holdDrive("GET", `/v1/drive/baidu/ls?${new URLSearchParams({ path })}`, g.user.email)
  return NextResponse.json(r.body, { status: r.status, headers: { "cache-control": "private, no-store" } })
}
