import { Suspense } from "react"
import type { Metadata } from "next"

import { ProjectView } from "@/components/projects/project-view"
import { NoAccess } from "@/components/shell/no-access"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { getCurrentUser } from "@/lib/server/current-user"
import { listMembers } from "@/lib/server/members"
import { listIssuesInScope } from "@/lib/server/issues"
import { listRefs } from "@/lib/server/project-refs"
import { accessOf, canView, getProject } from "@/lib/server/projects"

export const metadata: Metadata = { title: "项目" }

/** 服务端确认：是项目成员才能看；按角色给出“能编辑 / 能管理”（接口会再校验） */
export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params
  const user = await getCurrentUser()
  const p = getProject(id)
  if (!user || !p || !canView(p, user.email)) return <NoAccess feature="这个项目" />
  const directory = listMembers()
    .filter((m) => m.status !== "disabled")
    .map((m) => ({ email: m.email, name: m.name }))
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <ProjectView initial={p} initialRefs={listRefs(p.id)} issues={listIssuesInScope(`proj:${p.id}`)} access={accessOf(p, user.email)} directory={directory} />
    </Suspense>
  )
}
