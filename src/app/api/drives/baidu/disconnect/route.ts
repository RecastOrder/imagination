import { NextResponse } from "next/server"

import { holdDrive } from "@/lib/server/hold-library"
import { requireMyFiles } from "@/lib/server/my-files"

/** 百度网盘：断开（删掉 hold 上这个人的百度登录态） */
export async function POST() {
  const g = await requireMyFiles()
  if (g.error) return g.error
  const r = await holdDrive("POST", "/v1/drive/baidu/disconnect", g.user.email, { body: {} })
  return NextResponse.json(r.body, { status: r.status })
}
