import { NextResponse } from "next/server"

import { serveHoldFile } from "@/lib/server/hold-files"
import { requireMyFiles } from "@/lib/server/my-files"

/** 我的文件：打开 / 下载自己文件夹里的一个文件。?path=&download=1 */
export async function GET(req: Request) {
  const g = await requireMyFiles()
  if (g.error) return g.error
  const q = new URL(req.url).searchParams
  const path = q.get("path")
  if (!g.mine(path) || path === g.home) return NextResponse.json({ error: "只能打开自己文件夹里的文件" }, { status: 403 })
  return serveHoldFile(path, !!q.get("download"))
}
