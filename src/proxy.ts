import { NextResponse, type NextRequest } from "next/server"

import { SESSION_COOKIE, checkSession } from "@/lib/server/session"

/**
 * 登录拦截：访问应用区时，没有有效会话就跳到登录页，
 * 并带上原来要去的地址（next）和原因（reason，例如“在另一台设备上登录了”）。
 * 这只是“第一道门”，页面和每个接口仍要自己校验。
 */
export async function proxy(request: NextRequest) {
  const check = await checkSession(request.cookies.get(SESSION_COOKIE)?.value)
  if (check.ok) return NextResponse.next()
  const url = new URL("/login", request.url)
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search)
  if (check.reason === "replaced" || check.reason === "disabled" || check.reason === "revoked" || check.reason === "expired") {
    url.searchParams.set("reason", check.reason)
  }
  const res = NextResponse.redirect(url)
  if (check.reason !== "none") res.cookies.delete(SESSION_COOKIE)
  return res
}

export const config = {
  matcher: [
    "/chat/:path*",
    "/browse/:path*",
    "/library/:path*",
    "/notebook/:path*",
    "/files/:path*",
    "/admin/:path*",
    "/design/:path*",
    "/settings/:path*",
  ],
}
