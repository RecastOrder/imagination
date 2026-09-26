import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/server/current-user"
import { holdGet, holdStream, isHoldId } from "@/lib/server/hold-library"

/**
 * 规范 / 图集的原件 PDF（hold 上那一份，流式转发）。语料不对外：必须登录。
 * ?download=1 = 下载到本机：要有「原件下载与打印」权限（owner 2026-09-26「需要给权限，暂时不开放给user」），
 * 没有 ⇒ 403。界面上藏按钮只是体验，这里才是那道闸。
 * ⚠ 挡不住的：在线阅读本来就要把原件传到浏览器里，会用开发者工具的人照样能存下来 —— 这道闸管的是「正常用法里给不给」，
 * 不是防一个铁了心的人（R47：第一道防线始终是名单本身要小）。
 */
export async function GET(req: Request, { params }: RouteContext<"/api/sources/[id]/file">) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { id } = await params
  if (!isHoldId(id) || id.startsWith("hm-")) return NextResponse.json({ error: "没有原件" }, { status: 404 })
  const download = new URL(req.url).searchParams.get("download") === "1"
  if (download && !user.permissions.features.original_download.on) {
    return NextResponse.json({ error: "没有「原件下载与打印」权限，请联系管理员" }, { status: 403 })
  }
  const r = await holdStream(`/v1/file/${id}`)
  if (!download || !r.ok) return r
  const s = await holdGet(id)
  const name = `${(s?.code ?? s?.title ?? id).replace(/[\\/:*?"<>|]/g, "_")}.pdf`
  const headers = new Headers(r.headers)
  headers.set("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(name)}`)
  return new Response(r.body, { status: 200, headers })
}
