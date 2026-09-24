import { AccountBoundary } from "@/components/account/account-boundary"

/** 阅读模式：没有侧栏，但同样需要账户信息（加入项目、偏好等） */
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return <AccountBoundary>{children}</AccountBoundary>
}
