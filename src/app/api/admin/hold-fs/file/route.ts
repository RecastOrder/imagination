import { NextResponse } from "next/server"

import { requireHoldAdmin, tankPath } from "@/lib/server/admin-hold"
import { logAdminView } from "@/lib/server/audit"
import { holdStream } from "@/lib/server/hold-library"

/**
 * 打开 / 下载 hold 上的一个文件（只读）。?path=/tank/... &download=1
 * 每次打开记一条查看记录（/admin/audit），和管理员打开成员文件同一本账。
 */
export async function GET(req: Request) {
  const g = await requireHoldAdmin()
  if (g.error) return g.error
  const q = new URL(req.url).searchParams
  const path = tankPath(q.get("path") || "")
  if (!path || path === "/tank") return NextResponse.json({ error: "只能打开 /tank 以内的文件" }, { status: 404 })
  const name = path.split("/").pop() || "file"
  const owner = path.startsWith("/tank/people/") ? (path.split("/")[3] ?? "hold") : "hold"
  logAdminView({ admin: g.user.email, owner, itemId: `hold:${path}`, itemName: name })
  const r = await holdStream(`/v1/fs/file?${new URLSearchParams({ path })}`)
  if (!r.ok) return r
  const headers = new Headers(r.headers)
  headers.set("cache-control", "private, no-store")
  headers.set("content-disposition", `${q.get("download") ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(name)}`)
  return new Response(r.body, { status: 200, headers })
}
