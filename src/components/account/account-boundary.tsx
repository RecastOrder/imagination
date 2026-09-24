import { redirect } from "next/navigation"

import { FEATURE_ORDER, ROLES, type Feature } from "@/lib/auth/permissions"
import { getCurrentUser } from "@/lib/server/current-user"
import { getPrefs } from "@/lib/server/prefs"
import { listProjectsFor } from "@/lib/server/projects"
import { AccountProvider } from "./account-provider"

/**
 * 服务端：读取当前账户（成员信息、权限、偏好、参与的项目），交给前端的 AccountProvider。
 * 应用区和阅读模式都套这一层。proxy.ts 已经拦过未登录，这里再检查一次。
 */
export async function AccountBoundary({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return (
    <AccountProvider
      email={user.email}
      name={user.member.name}
      roleLabel={ROLES[user.member.role].label}
      isAdmin={user.permissions.features.admin.on}
      features={Object.fromEntries(FEATURE_ORDER.map((f) => [f, user.permissions.features[f].on])) as Record<Feature, boolean>}
      projects={listProjectsFor(user.email).map((p) => ({ id: p.id, name: p.name }))}
      initialPrefs={getPrefs(user.email)}
    >
      {children}
    </AccountProvider>
  )
}
