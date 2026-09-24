import { Suspense } from "react"
import type { Metadata } from "next"

import { NoAccess } from "@/components/shell/no-access"
import { requireFeature } from "@/lib/server/guard"
import { LibraryView } from "@/components/library/library-view"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { PeekLayout } from "@/components/shell/peek-layout"

export const metadata: Metadata = { title: "资料库" }

export default async function LibraryPage() {
  if (!(await requireFeature("library"))) return <NoAccess feature="资料库" />
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <PeekLayout>
        <LibraryView />
      </PeekLayout>
    </Suspense>
  )
}
