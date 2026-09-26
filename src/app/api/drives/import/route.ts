import { NextResponse } from "next/server"

import { holdDrive } from "@/lib/server/hold-library"
import { requireMyFiles } from "@/lib/server/my-files"

/**
 * 保存到服务器（owner 2026-09-27「如果想导入到服务器可以选择文件并保存到服务器」）：
 * { kind: "baidu", paths: [网盘路径…], dest: 自己文件夹里的某一层 }。hold 后台拷，返回任务号；50GB 上限由 hold 管。
 */
export async function POST(req: Request) {
  const g = await requireMyFiles()
  if (g.error) return g.error
  const b = (await req.json().catch(() => null)) as { kind?: unknown; paths?: unknown; dest?: unknown } | null
  const okPath = (p: unknown) => typeof p === "string" && p.startsWith("/") && !p.includes("\0") && !p.split("/").includes("..")
  if (!b || b.kind !== "baidu" || !Array.isArray(b.paths) || b.paths.length < 1 || b.paths.length > 200 || !b.paths.every(okPath))
    return NextResponse.json({ error: "参数不对" }, { status: 400 })
  const dest = typeof b.dest === "string" ? b.dest : g.home
  if (!g.mine(dest)) return NextResponse.json({ error: "只能存进自己的文件夹" }, { status: 403 })
  const r = await holdDrive("POST", "/v1/drive/import", g.user.email, { body: { kind: "baidu", paths: b.paths, dest }, scope: g.home })
  return NextResponse.json(r.body, { status: r.status })
}
