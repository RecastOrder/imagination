import { NextResponse } from "next/server"

import { requireHoldAdmin, tankPath } from "@/lib/server/admin-hold"
import { holdFsList } from "@/lib/server/hold-library"

/** 列 hold 上一个文件夹（只读）。?path=/tank/... &offset= */
export async function GET(req: Request) {
  const g = await requireHoldAdmin()
  if (g.error) return g.error
  const q = new URL(req.url).searchParams
  const path = tankPath(q.get("path"))
  if (!path) return NextResponse.json({ error: "只能浏览 /tank 以内的文件夹" }, { status: 404 })
  const r = await holdFsList(path, Math.max(0, Number(q.get("offset")) || 0))
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status })
  return NextResponse.json(r, { headers: { "cache-control": "private, no-store" } })
}
