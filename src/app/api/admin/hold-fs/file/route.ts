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
  const r = await holdStream(`/v1/fs/file?${new URLSearchParams({ path })}`)
  if (!r.ok) return r
  // 确实取到了才记（不存在的路径不留记录）
  logAdminView({ admin: g.user.email, owner, itemId: `hold:${path}`, itemName: name })
  const headers = new Headers(r.headers)
  const type = headers.get("content-type") ?? ""
  // hold 上多是从外站抓来的东西：SVG / HTML 里可能带脚本，在本站打开 = 以管理员身份在 recastorder.com 上执行。
  // ⇒ 只有 PDF / 位图 / 纯文本 / 音视频允许在浏览器里打开，其余一律下载；并对所有响应加沙箱。
  const inlineOk = /^(application\/pdf|image\/(jpeg|png|gif|webp)|text\/plain|audio\/|video\/)/.test(type)
  const inline = !q.get("download") && inlineOk
  if (!inlineOk) headers.set("content-type", "application/octet-stream")
  headers.set("content-security-policy", "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'")
  headers.set("x-content-type-options", "nosniff")
  headers.set("cache-control", "private, no-store")
  headers.set("content-disposition", `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(name)}`)
  return new Response(r.body, { status: 200, headers })
}
