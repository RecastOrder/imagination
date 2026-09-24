import { Suspense } from "react"
import type { Metadata } from "next"

import { NoAccess } from "@/components/shell/no-access"
import { requireFeature } from "@/lib/server/guard"
import { ChatView } from "@/components/chat/chat-view"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { PeekLayout } from "@/components/shell/peek-layout"

export const metadata: Metadata = { title: "对话" }

export default async function ChatPage() {
  if (!(await requireFeature("chat"))) return <NoAccess feature="AI 对话" />
  return (
    <Suspense fallback={<PageSkeleton variant="chat" />}>
      <PeekLayout>
        <ChatView />
      </PeekLayout>
    </Suspense>
  )
}
