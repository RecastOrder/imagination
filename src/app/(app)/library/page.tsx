import { Suspense } from "react"
import type { Metadata } from "next"

import { LibraryView } from "@/components/library/library-view"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { PeekLayout } from "@/components/shell/peek-layout"

export const metadata: Metadata = { title: "资料库" }

export default function LibraryPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <PeekLayout>
        <LibraryView />
      </PeekLayout>
    </Suspense>
  )
}
