import { redirect } from "next/navigation"

import { AccountProvider } from "@/components/account/account-provider"
import { AppShell } from "@/components/shell/app-shell"
import { FEATURE_ORDER, ROLES, type Feature } from "@/lib/auth/permissions"
import { getCurrentUser } from "@/lib/server/current-user"
import { getPrefs } from "@/lib/server/prefs"

/**
 * 登录后的应用区：读取当前账户和偏好，套上 AppShell（侧栏 + 主区）。
 * proxy.ts 已经拦过一次；这里再检查一次，防止漏网。
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return (
    <AccountProvider
      email={user.email}
      name={user.member.name}
      roleLabel={ROLES[user.member.role].label}
      isAdmin={user.permissions.features.admin.on}
      features={Object.fromEntries(FEATURE_ORDER.map((f) => [f, user.permissions.features[f].on])) as Record<Feature, boolean>}
      initialPrefs={getPrefs(user.email)}
    >
      <AppShell>{children}</AppShell>
    </AccountProvider>
  )
}
