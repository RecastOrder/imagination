import type { Metadata } from "next"

import { AdminViewLog } from "@/components/admin/admin-view-log"
import { NoAccess } from "@/components/shell/no-access"
import { listAdminViews } from "@/lib/server/audit"
import { getCurrentUser } from "@/lib/server/current-user"
import { findMember, isAdmin } from "@/lib/server/members"

export const metadata: Metadata = { title: "查看记录" }

/** 只有管理员能看查看记录（服务端校验） */
export default async function AuditPage() {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.email)) return <NoAccess feature="查看记录" />
  const entries = listAdminViews()
  const names = Object.fromEntries(
    [...new Set(entries.flatMap((e) => [e.admin, e.owner]))].map((m) => [m, findMember(m)?.name ?? m.split("@")[0]]),
  )
  return <AdminViewLog entries={entries} nameOf={(m) => names[m] ?? m} />
}
