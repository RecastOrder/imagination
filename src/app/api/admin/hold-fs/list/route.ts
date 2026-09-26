import { NextResponse } from "next/server"

import { requireHoldAdmin, tankPath } from "@/lib/server/admin-hold"
import { SHARED_SCOPE, listIn } from "@/lib/server/hold-files"

/** 存储总库：列 hold 上一个文件夹。?path=/tank/... &offset=（editable = 这里能不能改：只有 inbox / baidu） */
export async function GET(req: Request) {
  const g = await requireHoldAdmin()
  if (g.error) return g.error
  const q = new URL(req.url).searchParams
  const path = tankPath(q.get("path"))
  if (!path) return NextResponse.json({ error: "只能浏览 /tank 以内的文件夹" }, { status: 404 })
  return listIn(path, Math.max(0, Number(q.get("offset")) || 0), SHARED_SCOPE, false)
}
