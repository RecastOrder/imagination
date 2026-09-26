import { NextResponse } from "next/server"

import { holdDrive } from "@/lib/server/hold-library"
import { requireMyFiles } from "@/lib/server/my-files"

/** 百度网盘：生成登录二维码（hold 取回图片转成 data URI；网页不在大陆，不让浏览器直连百度） */
export async function POST() {
  const g = await requireMyFiles()
  if (g.error) return g.error
  const r = await holdDrive("POST", "/v1/drive/baidu/qr", g.user.email, { body: {} })
  return NextResponse.json(r.body, { status: r.status })
}
