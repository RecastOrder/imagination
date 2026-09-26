import { NextResponse } from "next/server"

import { getCurrentUser } from "./current-user"

/**
 * 管理员「我的文件」= hold 上的全部文件（owner 2026-09-26）。只有**真管理员、且没开对比视角**才能用：
 * 对比视角是「以普通成员的眼睛看」，那时这里必须和普通成员一样看不到。
 */
export async function requireHoldAdmin() {
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: "未登录" }, { status: 401 }) }
  if (!user.realAdmin || user.viewingAsMember) return { error: NextResponse.json({ error: "只有管理员能浏览 hold 上的文件" }, { status: 403 }) }
  return { user }
}

/** 本机这一侧也只放 /tank 以内的路径（hold 端还有一道按真实路径的判定；两道各自独立） */
export function tankPath(p: string | null): string | null {
  if (!p) return "/tank"
  if (p.includes("\0") || p.split("/").includes("..")) return null
  return p === "/tank" || p.startsWith("/tank/") ? p : null
}
