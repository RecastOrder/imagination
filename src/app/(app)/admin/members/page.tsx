import type { Metadata } from "next"

import { MembersView } from "@/components/admin/members-view"

export const metadata: Metadata = { title: "成员与权限" }

export default function MembersPage() {
  return <MembersView />
}
