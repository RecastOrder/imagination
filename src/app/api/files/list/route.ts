import { NextResponse } from "next/server"

import { listIn } from "@/lib/server/hold-files"
import { requireMyFiles } from "@/lib/server/my-files"

/** 我的文件：列自己文件夹里的一层。?path=（缺省 = 自己的文件夹） */
export async function GET(req: Request) {
  const g = await requireMyFiles()
  if (g.error) return g.error
  const q = new URL(req.url).searchParams
  const path = q.get("path") || g.home
  if (!g.mine(path)) return NextResponse.json({ error: "只能看自己的文件夹" }, { status: 403 })
  return listIn(path, Math.max(0, Number(q.get("offset")) || 0), g.home, path === g.home)
}
