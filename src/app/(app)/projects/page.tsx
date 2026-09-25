import type { Metadata } from "next"
import Link from "next/link"
import { MapPinIcon, UsersIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { NewProject } from "@/components/projects/new-project"
import { getCurrentUser } from "@/lib/server/current-user"
import { isAdmin, listMembers } from "@/lib/server/members"
import { MEMBER_ROLES, type Project } from "@/lib/projects/types"
import { cn } from "@/lib/utils"
import { roleIn, listProjectsFor } from "@/lib/server/projects"

export const metadata: Metadata = { title: "项目" }

/** 我参与的项目（管理员看全部）。管理员和被指定的人可以新建项目（已定） */
export default async function ProjectsPage() {
  const user = await getCurrentUser()
  const projects = user ? listProjectsFor(user.email) : []
  const active = projects.filter((p) => !p.archivedAt)
  const archived = projects.filter((p) => p.archivedAt)
  const canCreate = !!user?.permissions.features.project_create.on
  const directory = listMembers()
    .filter((m) => m.status !== "disabled")
    .map((m) => ({ email: m.email, name: m.name }))
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">项目</h1>
            <p className="mt-1 text-sm text-muted-foreground">以项目为单位：位置与适用要求、依据清单、指标核对、成员和分析工具。</p>
          </div>
          {user && canCreate && <NewProject me={user.email} isAdmin={isAdmin(user.email)} directory={directory} />}
        </div>
        {projects.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            {canCreate ? "还没有项目。点右上角“新建项目”开始。" : "你还没有加入任何项目。请联系项目负责人把你拉进项目。"}
          </p>
        ) : (
          <>
            <ProjectGrid projects={active} email={user!.email} />
            {archived.length > 0 && (
              // 已归档：默认收起，不占主列表；项目不能删除，只能归档
              <details className="mt-10">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground">已归档 {archived.length}</summary>
                <ProjectGrid projects={archived} email={user!.email} />
              </details>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ProjectGrid({ projects, email }: { projects: Project[]; email: string }) {
  if (projects.length === 0) return <p className="mt-8 text-sm text-muted-foreground">没有进行中的项目。</p>
  return (
    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
      {projects.map((p) => {
        const lead = p.members.find((m) => m.role === "lead")
        const mine = roleIn(p, email)
        return (
          <li key={p.id}>
            <Link
              href={`/projects/${p.id}`}
              className={cn("block rounded-xl border bg-surface p-5 transition-colors hover:border-border-strong", p.archivedAt && "bg-surface-sunken/60")}
            >
              <div className="flex items-center gap-2">
                <p className="flex-1 font-medium">{p.name}</p>
                {p.archivedAt && <Badge variant="outline">已归档</Badge>}
                <Badge>{p.type}</Badge>
                <Badge variant="outline">{p.stage}</Badge>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPinIcon className="size-3.5" />
                {p.location.city} {p.location.district}
                {p.location.address && ` · ${p.location.address}`}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <UsersIcon className="size-3.5" />
                {p.members.length} 位成员 · 负责人 {lead?.email.split("@")[0]}
                <span className="ml-auto">我的权限：{mine ? MEMBER_ROLES[mine].label : "管理员"}</span>
              </p>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
