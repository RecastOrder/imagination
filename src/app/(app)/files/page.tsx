import { Suspense } from "react"
import type { Metadata } from "next"

import { NoAccess } from "@/components/shell/no-access"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { requireFeature } from "@/lib/server/guard"
import { holdEnabled } from "@/lib/server/hold-library"
import { FilesView } from "@/components/files/files-view"
import { HoldFilesView } from "@/components/files/hold-files-view"

export const metadata: Metadata = { title: "我的文件" }

/**
 * 我的文件。管理员（没开对比视角时）看到的是 hold 上的全部文件夹（owner 2026-09-26「对于管理员来说，
 * 管理员的我的文件就是hold上的文件」）；其他人照旧是自己的上传。
 */
export default async function FilesPage() {
  const user = await requireFeature("upload")
  if (!user) return <NoAccess feature="上传与云盘" />
  if (user.realAdmin && !user.viewingAsMember && holdEnabled()) {
    return (
      <Suspense fallback={<PageSkeleton variant="list" />}>
        <HoldFilesView />
      </Suspense>
    )
  }
  return <FilesView />
}
