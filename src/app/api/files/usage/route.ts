import { NextResponse } from "next/server"

import { holdDrive } from "@/lib/server/hold-library"
import { requireMyFiles } from "@/lib/server/my-files"

/** 我的服务器空间：已用 / 上限（owner 2026-09-27「每个人的服务器空间按照50GB为限额先」；上限由 hold 定，这里不另写一份） */
export async function GET() {
  const g = await requireMyFiles()
  if (g.error) return g.error
  const r = await holdDrive("GET", "/v1/fs/usage", g.user.email, { scope: g.home })
  return NextResponse.json(r.body, { status: r.status, headers: { "cache-control": "private, no-store" } })
}
