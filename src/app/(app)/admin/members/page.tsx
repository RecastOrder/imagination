import type { Metadata } from "next"

import { MembersView } from "@/components/admin/members-view"
import { NoAccess } from "@/components/shell/no-access"
import { getCurrentUser } from "@/lib/server/current-user"
import { isAdmin, listMembers } from "@/lib/server/members"

export const metadata: Metadata = { title: "成员与权限" }

/** 服务端先确认是管理员；不是就显示无权限说明页（侧栏里本来也不会出现这个入口） */
export default async function MembersPage() {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.email)) return <NoAccess feature="成员管理" />
  return <MembersView initialMembers={listMembers()} currentEmail={user.email} />
}
