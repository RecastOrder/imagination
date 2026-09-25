import { cookies } from "next/headers"

import { resolve } from "@/lib/auth/permissions"
import { asViewedMember, findMember, isRealAdmin, viewingAsMember } from "./members"
import { SESSION_COOKIE, checkSession } from "./session"

/** 在服务端组件 / 接口里取当前登录用户（含成员信息和最终权限）；未登录返回 null */
export async function getCurrentUser() {
  const check = await checkSession((await cookies()).get(SESSION_COOKIE)?.value)
  if (!check.ok) return null
  const real = findMember(check.session.email)
  if (!real) return null
  // 管理员打开了对比视角：之后的所有判定都按普通成员（realAdmin 只给“切回来”那个开关用）
  const viewAs = viewingAsMember(real.email)
  const member = viewAs ? asViewedMember(real) : real
  return {
    email: member.email,
    sid: check.session.sid,
    member,
    permissions: resolve(member),
    realAdmin: isRealAdmin(real.email),
    viewingAsMember: viewAs,
  }
}
