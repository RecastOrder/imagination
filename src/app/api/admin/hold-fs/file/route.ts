import { NextResponse } from "next/server"

import { requireHoldAdmin, tankPath } from "@/lib/server/admin-hold"
import { logAdminView } from "@/lib/server/audit"
import { serveHoldFile } from "@/lib/server/hold-files"

/**
 * 存储总库：打开 / 下载 hold 上的一个文件。?path=/tank/... &download=1
 * 每次打开记一条查看记录（/admin/audit），和管理员打开成员文件同一本账。
 */
export async function GET(req: Request) {
  const g = await requireHoldAdmin()
  if (g.error) return g.error
  const q = new URL(req.url).searchParams
  const path = tankPath(q.get("path") || "")
  if (!path || path === "/tank") return NextResponse.json({ error: "只能打开 /tank 以内的文件" }, { status: 404 })
  const r = await serveHoldFile(path, !!q.get("download"))
  // 确实取到了才记（不存在的路径不留记录）
  if (r.ok) {
    const owner = path.startsWith("/tank/people/") ? (path.split("/")[3] ?? "hold") : "hold"
    logAdminView({ admin: g.user.email, owner, itemId: `hold:${path}`, itemName: path.split("/").pop() || "file" })
  }
  return r
}
