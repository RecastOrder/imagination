import { AccountBoundary } from "@/components/account/account-boundary"
import { AppShell } from "@/components/shell/app-shell"

/** 登录后的应用区：读取当前账户和偏好，套上 AppShell（侧栏 + 主区） */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountBoundary>
      <AppShell>{children}</AppShell>
    </AccountBoundary>
  )
}
