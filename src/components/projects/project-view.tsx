"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeftIcon, FolderTreeIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { useLocalStore } from "@/hooks/use-local-store"
import { runChecks } from "@/lib/projects/checks"
import { projectRefsStore } from "@/lib/projects/refs"
import type { Project } from "@/lib/projects/types"
import { cn } from "@/lib/utils"
import { ChecksTab } from "./checks-tab"
import { MembersTab } from "./members-tab"
import { OverviewTab } from "./overview-tab"
import { RefsTab } from "./refs-tab"
import { ToolsTab } from "./tools-tab"

type Tab = "overview" | "refs" | "checks" | "members" | "tools"

/**
 * 项目页：以项目为单位看位置与适用要求、依据清单、指标核对、成员和分析工具。
 * 当前标签记在网址里（?tab=），可以直接分享某个标签的链接。
 */
export function ProjectView({
  initial,
  canEdit,
  directory,
}: {
  initial: Project
  canEdit: boolean
  directory: { email: string; name: string }[]
}) {
  const [project, setProject] = useState(initial)
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tab = (params.get("tab") as Tab | null) ?? "overview"
  const [refs] = useLocalStore(projectRefsStore)
  const refCount = refs.filter((r) => r.projectId === project.id).length
  const fails = runChecks(project).filter((r) => r.status === "fail").length

  const save = async (patch: object) => {
    const r = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    })
    const data = await r.json()
    if (!r.ok) {
      toast(data.error ?? "保存失败")
      return false
    }
    setProject(data)
    toast("已保存")
    router.refresh()
    return true
  }

  const TABS: { value: Tab; label: string; count?: number; alert?: boolean }[] = [
    { value: "overview", label: "概况" },
    { value: "refs", label: "依据清单", count: refCount },
    { value: "checks", label: "指标核对", count: fails || undefined, alert: fails > 0 },
    { value: "members", label: "成员", count: project.members.length },
    { value: "tools", label: "分析工具" },
  ]

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
        <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4" />
          全部项目
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <Badge>{project.type}</Badge>
          <Badge variant="outline">{project.stage}</Badge>
          <span className="text-sm text-muted-foreground">
            {project.location.city} {project.location.district}
          </span>
          <Button asChild variant="outline" size="sm" className="ml-auto">
            <Link href={`/browse?f=${encodeURIComponent(`proj/${project.id}`)}`}>
              <FolderTreeIcon />
              项目文件
            </Link>
          </Button>
        </div>

        {/* 标签栏：下划线式标签，当前项用强调色 */}
        <nav aria-label="项目内容" className="mt-6 flex gap-1 overflow-x-auto border-b">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-current={tab === t.value ? "page" : undefined}
              onClick={() => router.replace(`${pathname}?tab=${t.value}`, { scroll: false })}
              className={cn(
                "-mb-px flex cursor-pointer items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground",
                tab === t.value && "border-primary font-medium text-foreground",
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={cn("rounded-full bg-secondary px-1.5 text-xs tabular-nums", t.alert && "bg-destructive/10 text-destructive")}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="py-6">
          {tab === "overview" && <OverviewTab project={project} canEdit={canEdit} onSave={save} />}
          {tab === "refs" && <RefsTab projectId={project.id} />}
          {tab === "checks" && <ChecksTab key={JSON.stringify(project.metrics)} project={project} canEdit={canEdit} onSave={save} />}
          {tab === "members" && <MembersTab project={project} canEdit={canEdit} directory={directory} onSave={save} />}
          {tab === "tools" && <ToolsTab project={project} />}
        </div>
      </div>
    </div>
  )
}
