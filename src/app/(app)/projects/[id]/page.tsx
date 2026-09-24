import { Suspense } from "react"
import type { Metadata } from "next"

import { ProjectView } from "@/components/projects/project-view"
import { NoAccess } from "@/components/shell/no-access"
import { PageSkeleton } from "@/components/shell/page-skeleton"
import { getCurrentUser } from "@/lib/server/current-user"
import { listMembers } from "@/lib/server/members"
import { canEdit, canView, getProject } from "@/lib/server/projects"

export const metadata: Metadata = { title: "项目" }

/** 服务端确认：是项目成员才能看；负责人 / 管理员才能改 */
export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params
  const user = await getCurrentUser()
  const p = getProject(id)
  if (!user || !p || !canView(p, user.email)) return <NoAccess feature="这个项目" />
  const editable = canEdit(p, user.email)
  const directory = listMembers()
    .filter((m) => m.status !== "disabled")
    .map((m) => ({ email: m.email, name: m.name }))
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <ProjectView initial={p} canEdit={editable} directory={directory} />
    </Suspense>
  )
}
