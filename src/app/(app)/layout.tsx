import { AppShell } from "@/components/shell/app-shell"

/** 登录后的应用区：统一套上 AppShell（侧栏 + 主区） */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
