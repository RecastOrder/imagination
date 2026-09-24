import { Suspense } from "react"
import type { Metadata } from "next"

import { DriveView } from "@/components/drive/drive-view"
import { NoAccess } from "@/components/shell/no-access"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { findNode, myTree } from "@/lib/drive/sample-tree"
import { requireFeature } from "@/lib/server/guard"
import { listMembers } from "@/lib/server/members"
import { canEditContent, listProjectsFor } from "@/lib/server/projects"
import { listSharedWith, listSharesBy } from "@/lib/server/shares"

export const metadata: Metadata = { title: "文件浏览" }

/**
 * 能看到什么由服务端决定，不交给页面自己判断：
 * - 项目：成员才能看（管理员看全部），并带上我在每个项目里的档位
 * - 我的：自己的文件 + 别人共享给我的（带主人和档位）
 */
export default async function BrowsePage() {
  const user = await requireFeature("library")
  if (!user) return <NoAccess feature="资料库" />
  const projects = listProjectsFor(user.email).map((p) => ({
    id: p.id,
    name: p.name,
    hint: `${p.location.city.replace(/市$/, "")} · ${p.type} · ${p.stage}`,
    access: canEditContent(p, user.email) ? ("edit" as const) : ("view" as const),
  }))
  const members = listMembers().filter((m) => m.status !== "disabled")
  const nameOf = (email: string) => members.find((m) => m.email === email)?.name ?? email.split("@")[0]
  const sharedWithMe = listSharedWith(user.email)
    .map((s) => {
      const node = findNode(myTree(s.owner), s.itemId)
      return node ? { node, share: s, ownerName: nameOf(s.owner) } : null
    })
    .filter((x) => !!x)
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <DriveView
        email={user.email}
        projects={projects}
        mine={myTree(user.email)}
        sharedWithMe={sharedWithMe}
        myShares={listSharesBy(user.email)}
        directory={members.filter((m) => m.email !== user.email).map((m) => ({ email: m.email, name: m.name }))}
      />
    </Suspense>
  )
}
