import { NextResponse } from "next/server"

import { cairnGh } from "@/lib/server/cairn-gh"
import { getCurrentUser } from "@/lib/server/current-user"

const ID = /^ghr-\d{8}T\d{6}-[0-9a-f]{6}$/
const NAME = /^ghr-\d{8}T\d{6}-[0-9a-f]{6}(\.gh|\.3dm|-canvas\.png|-persp\.png)$/

/** 一单的结果文件：两张图直接显示，.gh / .3dm 下载。只转发 Cairn 认可的那几种名字 */
export async function GET(_req: Request, { params }: RouteContext<"/api/gh/requests/[id]/files/[name]">) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  if (!user.permissions.features.tool_gh.on) return NextResponse.json({ error: "你没有 GH 生成器的权限，请联系管理员" }, { status: 403 })
  const { id, name } = await params
  if (!ID.test(id) || !NAME.test(name) || !name.startsWith(id)) return NextResponse.json({ error: "没有这个文件" }, { status: 404 })
  const r = await cairnGh(`/requests/${id}/files/${name}${user.viewingAsMember ? "?scope=mine" : ""}`, user.email)
  if (r.status === 404) return NextResponse.json({ error: "没有这个文件" }, { status: 404 })
  if (!r.ok || !r.body) return r.status === 503 || r.status === 502 ? r : NextResponse.json({ error: `生成器返回错误（${r.status}）` }, { status: 502 })
  const png = name.endsWith(".png")
  return new Response(r.body, {
    headers: {
      "content-type": png ? "image/png" : "application/octet-stream",
      "content-disposition": png ? `inline; filename="${name}"` : `attachment; filename="${name}"`,
      // 短缓存：权限被撤掉后，浏览器里留着的图最多再看 5 分钟
      "cache-control": "private, max-age=300",
      "x-content-type-options": "nosniff",
    },
  })
}
