import { Suspense } from "react"
import type { Metadata } from "next"

import { ChatView } from "@/components/chat/chat-view"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { PeekLayout } from "@/components/shell/peek-layout"

export const metadata: Metadata = { title: "对话" }

export default function ChatPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="chat" />}>
      <PeekLayout>
        <ChatView />
      </PeekLayout>
    </Suspense>
  )
}
