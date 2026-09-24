import type { Metadata } from "next"
import Link from "next/link"
import { MapPinIcon, UsersIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { getCurrentUser } from "@/lib/server/current-user"
import { MEMBER_ROLES } from "@/lib/projects/types"
import { roleIn, listProjectsFor } from "@/lib/server/projects"

export const metadata: Metadata = { title: "项目" }

/** 我参与的项目（管理员看全部）。新建项目将由管理员 / 项目负责人发起（后续） */
export default async function ProjectsPage() {
  const user = await getCurrentUser()
  const projects = user ? listProjectsFor(user.email) : []
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">项目</h1>
        <p className="mt-1 text-sm text-muted-foreground">以项目为单位：位置与适用要求、依据清单、指标核对、成员和分析工具。</p>
        {projects.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            你还没有加入任何项目。请联系项目负责人把你拉进项目。
          </p>
        ) : (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {projects.map((p) => {
              const lead = p.members.find((m) => m.role === "lead")
              const mine = roleIn(p, user!.email)
              return (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}`} className="block rounded-xl border bg-surface p-5 transition-colors hover:border-border-strong">
                    <div className="flex items-center gap-2">
                      <p className="flex-1 font-medium">{p.name}</p>
                      <Badge>{p.type}</Badge>
                      <Badge variant="outline">{p.stage}</Badge>
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPinIcon className="size-3.5" />
                      {p.location.city} {p.location.district} · {p.location.address}
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
        )}
      </div>
    </div>
  )
}
