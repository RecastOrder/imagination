import { NextResponse } from "next/server"

import { cairnGh, relayJson } from "@/lib/server/cairn-gh"
import { getCurrentUser } from "@/lib/server/current-user"

/** 我的 Grasshopper 生成记录（最近 30 单；管理员看全部） */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  if (!user.permissions.features.tool_gh.on) return NextResponse.json({ error: "你没有 GH 生成器的权限，请联系管理员" }, { status: 403 })
  // 对比视角（管理员以普通成员身份看）：只看本人的单，和普通成员看到的一样
  const r = await cairnGh(`/requests${user.viewingAsMember ? "?scope=mine" : ""}`, user.email)
  return relayJson(r)
}

/** 交一单：一段中文需求描述 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  if (!user.permissions.features.tool_gh.on) return NextResponse.json({ error: "你没有 GH 生成器的权限，请联系管理员" }, { status: 403 })
  // 只收 JSON：表单发不出 application/json，别的来源用脚本发会先触发预检而被浏览器拦下
  // （会话 Cookie 是 SameSite=Lax，挡得住别的网站，挡不住 recastorder.com 的其他子域名）
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "请求格式不对" }, { status: 415 })
  }
  const body = await req.json().catch(() => ({}))
  const text = typeof body?.text === "string" ? body.text.trim() : ""
  if (!text) return NextResponse.json({ error: "请先写下需求" }, { status: 400 })
  const r = await cairnGh("/requests", user.email, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  })
  return relayJson(r)
}
