import type { Metadata } from "next"

import { ChatView } from "@/components/chat/chat-view"
import { PeekLayout } from "@/components/shell/peek-layout"

export const metadata: Metadata = { title: "对话" }

export default function ChatPage() {
  return (
    <PeekLayout>
      <ChatView />
    </PeekLayout>
  )
}
