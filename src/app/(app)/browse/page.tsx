import { Suspense } from "react"
import type { Metadata } from "next"

import { DriveView } from "@/components/drive/drive-view"
import { NoAccess } from "@/components/shell/no-access"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { requireFeature } from "@/lib/server/guard"
import { listProjectsFor } from "@/lib/server/projects"

export const metadata: Metadata = { title: "文件浏览" }

/** 能看到哪些项目由服务端决定（成员才能看；管理员看全部），不交给页面自己判断 */
export default async function BrowsePage() {
  const user = await requireFeature("library")
  if (!user) return <NoAccess feature="资料库" />
  const projects = listProjectsFor(user.email).map((p) => ({
    id: p.id,
    name: p.name,
    hint: `${p.location.city.replace(/市$/, "")} · ${p.type} · ${p.stage}`,
  }))
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <DriveView projects={projects} />
    </Suspense>
  )
}
