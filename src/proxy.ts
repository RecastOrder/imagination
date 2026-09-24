import { NextResponse, type NextRequest } from "next/server"

import { SESSION_COOKIE, readSessionToken } from "@/lib/server/session"

/**
 * 登录拦截：访问应用区时，没有有效登录 Cookie 就跳到登录页，并记住原来要去的地址。
 * 这只是“第一道门”，每个接口仍要自己校验登录和权限。
 */
export async function proxy(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (session) return NextResponse.next()
  const url = new URL("/login", request.url)
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    "/chat/:path*",
    "/library/:path*",
    "/notebook/:path*",
    "/files/:path*",
    "/admin/:path*",
    "/design/:path*",
    "/settings/:path*",
  ],
}
