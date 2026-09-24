import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/server/current-user"
import { ConvertError, OFFICE_EXTS, convertOfficeToPdf } from "@/lib/server/office-convert"

const MAX_BYTES = 50 * 1024 * 1024

/**
 * Office 预览：网页把文件内容发过来（POST），返回转换好的 PDF。
 * 只转换“用户已经拿到的内容”，所以不会绕过文件权限；必须登录。
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const ext = (new URL(req.url).searchParams.get("ext") ?? "").toLowerCase()
  if (!OFFICE_EXTS.includes(ext)) return NextResponse.json({ error: "不支持的文件格式" }, { status: 400 })
  const len = Number(req.headers.get("content-length") ?? 0)
  if (len > MAX_BYTES) return NextResponse.json({ error: "文件超过 50 MB，请下载后在本机打开" }, { status: 413 })
  const bytes = Buffer.from(await req.arrayBuffer())
  if (bytes.length === 0 || bytes.length > MAX_BYTES) return NextResponse.json({ error: "文件为空或过大" }, { status: 400 })
  try {
    const pdf = await convertOfficeToPdf(bytes, ext)
    return new NextResponse(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Cache-Control": "private, max-age=3600" },
    })
  } catch (e) {
    const msg = e instanceof ConvertError ? e.message : "转换失败"
    return NextResponse.json({ error: msg }, { status: e instanceof ConvertError && /没有安装/.test(msg) ? 503 : 422 })
  }
}
