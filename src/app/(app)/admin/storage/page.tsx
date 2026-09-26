import { Suspense } from "react"
import type { Metadata } from "next"

import { NoAccess } from "@/components/shell/no-access"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { StorageView } from "@/components/files/storage-view"
import { getCurrentUser } from "@/lib/server/current-user"
import { holdEnabled } from "@/lib/server/hold-library"
import { redirect } from "next/navigation"

export const metadata: Metadata = { title: "存储总库" }

/**
 * 存储总库（storage）：管理员看 hold 上的全部文件（/tank）。owner 2026-09-26「"我的文件" 与管理员看到的tank我觉得要分开」
 * ⇒ 从「我的文件」里拆出来。只有真管理员、且没开对比视角；只有 inbox / baidu 能改，其余只读。
 */
export default async function StoragePage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!user.realAdmin || user.viewingAsMember) return <NoAccess feature="存储总库（只有管理员）" />
  if (!holdEnabled()) return <p className="p-8 text-sm text-muted-foreground">存储服务没有配置（HOLD_LIB_URL）。</p>
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <StorageView />
    </Suspense>
  )
}
