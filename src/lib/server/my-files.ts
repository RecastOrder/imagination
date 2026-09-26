import { NextResponse } from "next/server"

import { getCurrentUser } from "./current-user"
import { homeOf, within } from "./hold-files"
import { holdEnabled } from "./hold-library"

/**
 * 「我的文件」接口的门：登录 · 有「上传与云盘」功能 · hold 配置了 · 有自己的文件夹。
 * 返回自己的文件夹 home 与判「这个路径是不是我的」的函数；本机这一侧只放 home 以内，hold 那一侧再按真实路径判一次。
 */
export async function requireMyFiles() {
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: "未登录" }, { status: 401 }) }
  if (!user.permissions.features.upload.on) return { error: NextResponse.json({ error: "没有「上传与云盘」权限" }, { status: 403 }) }
  if (!holdEnabled()) return { error: NextResponse.json({ error: "文件服务没有配置" }, { status: 503 }) }
  const home = homeOf(user.email)
  if (!home) return { error: NextResponse.json({ error: "这个账号的邮箱不能用作文件夹名" }, { status: 400 }) }
  return { user, home, mine: (p: string | null) => within(home, p) }
}
