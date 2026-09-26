import { Suspense } from "react"
import type { Metadata } from "next"

import { NoAccess } from "@/components/shell/no-access"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { requireFeature } from "@/lib/server/guard"
import { homeOf } from "@/lib/server/hold-files"
import { holdEnabled } from "@/lib/server/hold-library"
import { FilesView } from "@/components/files/files-view"
import { MyFilesView } from "@/components/files/my-files-view"

export const metadata: Metadata = { title: "我的文件" }

/**
 * 我的文件：每个人（包括管理员）都是服务器上自己的那个文件夹 /tank/people/<邮箱>。
 * 管理员看全部文件的地方拆成了「存储总库」（/admin/storage，owner 2026-09-26「与管理员看到的tank我觉得要分开」）。
 * 没接文件服务的环境（本地演示）仍是原来的演示页。
 */
export default async function FilesPage() {
  const user = await requireFeature("upload")
  if (!user) return <NoAccess feature="上传与云盘" />
  const home = homeOf(user.email)
  if (!holdEnabled() || !home) return <FilesView />
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <MyFilesView home={home} />
    </Suspense>
  )
}
