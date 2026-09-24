import { Suspense } from "react"
import type { Metadata } from "next"

import { DriveView } from "@/components/drive/drive-view"
import { NoAccess } from "@/components/shell/no-access"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { projectsFor } from "@/lib/drive/projects"
import { requireFeature } from "@/lib/server/guard"

export const metadata: Metadata = { title: "文件浏览" }

/** 能看到哪些项目由服务端决定（成员才能看；管理员看全部），不交给页面自己判断 */
export default async function BrowsePage() {
  const user = await requireFeature("library")
  if (!user) return <NoAccess feature="资料库" />
  const projectIds = projectsFor(user.email, user.permissions.features.admin.on)
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <DriveView projectIds={projectIds} />
    </Suspense>
  )
}
