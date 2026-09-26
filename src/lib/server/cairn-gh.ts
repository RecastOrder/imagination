import { NextResponse } from "next/server"

/**
 * Grasshopper 生成器：转发到 Cairn 的服务口 /api/svc/gh/*（Cairn-Specs 105 · 101 §C.1）。
 *
 * 和对话同一套三道墙：同一台机器直连（CAIRN_SVC_URL）· 服务令牌 CAIRN_SERVICE_TOKEN ·
 * 替谁操作（X-Cairn-On-Behalf-Of）。谁能看哪一单由 Cairn 判（本人看自己的，管理员看全部），
 * 这里不另做一份判断。真正干活的是 hold 上的 worker，它从 Cairn 领单。
 */
export async function cairnGh(path: string, email: string, init?: RequestInit): Promise<Response> {
  const base = process.env.CAIRN_SVC_URL
  const token = process.env.CAIRN_SERVICE_TOKEN
  if (!base || !token) return NextResponse.json({ error: "Grasshopper 生成器还没有接通（服务器未配置）" }, { status: 503 })
  try {
    const headers = new Headers(init?.headers)
    headers.set("authorization", `Bearer ${token}`)
    headers.set("x-cairn-on-behalf-of", email)
    return await fetch(`${base}/api/svc/gh${path}`, { ...init, headers, cache: "no-store" })
  } catch {
    return NextResponse.json({ error: "生成器暂时连不上，请稍后再试" }, { status: 502 })
  }
}

/** Cairn 的 JSON 回答转成给浏览器的回答：403 说人话，其余错误带状态码，不吞 */
export async function relayJson(upstream: Response): Promise<Response> {
  if (upstream.status === 403) return NextResponse.json({ error: "你的账号还没有开通 Grasshopper 生成器，请联系管理员" }, { status: 403 })
  const body = await upstream.json().catch(() => null)
  if (!body) return NextResponse.json({ error: `生成器返回错误（${upstream.status}）` }, { status: 502 })
  return NextResponse.json(body, { status: upstream.status })
}
