import { redirect } from "next/navigation"

import { FEATURE_ORDER, type Feature, type ResolvedPermissions } from "@/lib/auth/permissions"
import { getCurrentUser } from "./current-user"

const HOME: Partial<Record<Feature, string>> = {
  chat: "/chat",
  library: "/library",
  notebook: "/notebook",
  upload: "/files",
  admin: "/admin/members",
}

/** 这个人有权限的第一个页面（登录后默认去这里） */
export function homeFor(p: ResolvedPermissions): string {
  const f = FEATURE_ORDER.find((k) => p.features[k].on && HOME[k])
  return f ? HOME[f]! : "/settings"
}

/**
 * 页面级权限检查（服务端）：未登录 → 登录页；没有这项功能 → 返回 null，由页面显示“无权限”说明。
 * 侧栏隐藏入口只是体验，这里才是真正的检查。
 */
export async function requireFeature(feature: Feature) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user.permissions.features[feature].on ? user : null
}
