import { cookies } from "next/headers"

import { SESSION_COOKIE, readSessionToken } from "./session"

/** 在服务端组件 / 接口里取当前登录用户；未登录返回 null */
export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const s = await readSessionToken(token)
  return s ? { email: s.email } : null
}
