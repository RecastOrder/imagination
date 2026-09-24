import type { Metadata } from "next"

import { LibraryView } from "@/components/library/library-view"
import { PeekLayout } from "@/components/shell/peek-layout"

export const metadata: Metadata = { title: "资料库" }

export default function LibraryPage() {
  return (
    <PeekLayout>
      <LibraryView />
    </PeekLayout>
  )
}
