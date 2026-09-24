import { cookies } from "next/headers"

import { resolve } from "@/lib/auth/permissions"
import { findMember } from "./members"
import { SESSION_COOKIE, checkSession } from "./session"

/** 在服务端组件 / 接口里取当前登录用户（含成员信息和最终权限）；未登录返回 null */
export async function getCurrentUser() {
  const check = await checkSession((await cookies()).get(SESSION_COOKIE)?.value)
  if (!check.ok) return null
  const member = findMember(check.session.email)
  if (!member) return null
  return { email: member.email, sid: check.session.sid, member, permissions: resolve(member) }
}
