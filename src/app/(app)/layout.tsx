import { redirect } from "next/navigation"

import { AccountProvider } from "@/components/account/account-provider"
import { AppShell } from "@/components/shell/app-shell"
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
    <AccountProvider email={user.email} initialPrefs={getPrefs(user.email)}>
      <AppShell>{children}</AppShell>
    </AccountProvider>
  )
}
