import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/server/current-user"

/**
 * 对话：把问题交给 Cairn 知识库（Cairn-Specs 105），原样转发它的 SSE 流。
 *
 * 服务器对服务器：同一台机器上直连 Cairn（CAIRN_SVC_URL，默认 http://127.0.0.1:8090），
 * 用服务令牌 CAIRN_SERVICE_TOKEN，并告诉 Cairn 是替谁问的 —— Cairn 按这个人自己的可见范围检索。
 * 没配置 Cairn 时返回 503，前端据此提示，不假装回答。
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const base = process.env.CAIRN_SVC_URL
  const token = process.env.CAIRN_SERVICE_TOKEN
  if (!base || !token) return NextResponse.json({ error: "知识库对话还没有接通（服务器未配置）" }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  const messages = Array.isArray(body.messages)
    ? body.messages
        .filter((m: unknown): m is { role: string; content: string } => {
          const x = m as { role?: unknown; content?: unknown }
          return (x?.role === "user" || x?.role === "assistant") && typeof x?.content === "string"
        })
        .slice(-12)
        .map((m: { role: string; content: string }) => ({ role: m.role, content: m.content.slice(0, 8000) }))
    : []
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "没有问题" }, { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${base}/api/svc/chat/stream`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        "x-cairn-on-behalf-of": user.email,
      },
      body: JSON.stringify({ messages }),
      signal: req.signal,
    })
  } catch {
    return NextResponse.json({ error: "知识库暂时连不上，请稍后再试" }, { status: 502 })
  }
  if (upstream.status === 403) {
    return NextResponse.json({ error: "你的账号还没有开通知识库对话，请联系管理员" }, { status: 403 })
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: `知识库返回错误（${upstream.status}）` }, { status: 502 })
  }
  return new Response(upstream.body, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  })
}
