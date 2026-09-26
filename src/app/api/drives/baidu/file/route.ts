import { NextResponse } from "next/server"

import { holdDriveStream } from "@/lib/server/hold-library"
import { requireMyFiles } from "@/lib/server/my-files"

/**
 * 百度网盘里的一个文件，实时读：hold 按区间从百度取、边取边转，服务器上不落副本。?path=&download=1
 * 和「我的文件」一样：只有 PDF / 位图 / 纯文本 / 音视频在浏览器里打开，其余一律当下载，并加沙箱。
 */
export async function GET(req: Request) {
  const g = await requireMyFiles()
  if (g.error) return g.error
  const q = new URL(req.url).searchParams
  const path = q.get("path") || ""
  // hold 那一侧也判；这里再独立判一次（两道）
  if (!path.startsWith("/") || path.includes("\0") || path.split("/").includes("..")) return NextResponse.json({ error: "路径不对" }, { status: 400 })
  const r = await holdDriveStream(`/v1/drive/baidu/file?${new URLSearchParams({ path })}`, g.user.email, req.headers.get("range"))
  if (!r.ok) return r
  const headers = new Headers(r.headers)
  const type = headers.get("content-type") ?? ""
  const inlineOk = /^(application\/pdf|image\/(jpeg|png|gif|webp)|text\/plain|audio\/|video\/)/.test(type)
  const inline = !q.get("download") && inlineOk
  if (!inlineOk) headers.set("content-type", "application/octet-stream")
  headers.set("content-security-policy", "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'")
  headers.set("x-content-type-options", "nosniff")
  headers.set("cache-control", "private, no-store")
  headers.set("content-disposition", `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(path.split("/").pop() || "file")}`)
  return new Response(r.body, { status: r.status, headers })
}
