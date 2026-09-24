import { Suspense } from "react"
import type { Metadata } from "next"

import { DriveView } from "@/components/drive/drive-view"
import { NoAccess } from "@/components/shell/no-access"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { requireFeature } from "@/lib/server/guard"

export const metadata: Metadata = { title: "文件浏览" }

export default async function BrowsePage() {
  if (!(await requireFeature("library"))) return <NoAccess feature="资料库" />
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <DriveView />
    </Suspense>
  )
}
