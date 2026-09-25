import { NextResponse } from "next/server"

import { getAnnotations, saveAnnotations } from "@/lib/server/annotations"
import { getCurrentUser } from "@/lib/server/current-user"
import { fileAccess } from "@/lib/server/file-access"

async function load(req: Request) {
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: "未登录" }, { status: 401 }) }
  const fileId = new URL(req.url).searchParams.get("fileId") ?? ""
  // 能看这个文件才能在上面做自己的标注（仅浏览的人也能测量，所以“能看”就够）
  if (!fileId || !fileAccess(user.email, fileId)) return { error: NextResponse.json({ error: "无权查看这个文件" }, { status: 404 }) }
  return { user, fileId }
}

/** 我在这个文件上的标注（只有自己的） */
export async function GET(req: Request) {
  const a = await load(req)
  if (a.error) return a.error
  return NextResponse.json(getAnnotations(a.user.email, a.fileId))
}

/** 保存我在这个文件上的全部标注：{ marks, scales } */
export async function PUT(req: Request) {
  const a = await load(req)
  if (a.error) return a.error
  const r = saveAnnotations(a.user.email, a.fileId, await req.json().catch(() => null))
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json(r.data)
}
