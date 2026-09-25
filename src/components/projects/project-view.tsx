"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArchiveIcon, ArchiveRestoreIcon, ArrowLeftIcon, EyeIcon, FolderTreeIcon, PencilIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import { runChecks } from "@/lib/projects/checks"
import type { ProjectRef } from "@/lib/projects/refs"
import { MEMBER_ROLES, type Project, type ProjectAccess } from "@/lib/projects/types"
import { cn } from "@/lib/utils"
import type { Issue } from "@/lib/drive/issues"
import type { ConditionRound } from "@/lib/projects/condition-rounds"
import { ChecksTab } from "./checks-tab"
import { IssuesTab } from "./issues-tab"
import { MembersTab } from "./members-tab"
import { OverviewTab } from "./overview-tab"
import { RefsTab } from "./refs-tab"
import { ToolsTab } from "./tools-tab"

type Tab = "overview" | "refs" | "issues" | "checks" | "members" | "tools"

/**
 * 项目页：以项目为单位看位置与适用要求、依据清单、指标核对、成员和分析工具。
 * 当前标签记在网址里（?tab=），可以直接分享某个标签的链接。
 */
export function ProjectView({
  initial,
  initialRefs,
  issues,
  rounds,
  access,
  directory,
}: {
  initial: Project
  /** 依据清单（服务端读好的，项目成员共享） */
  initialRefs: ProjectRef[]
  /** 项目文件上发起的问题 */
  issues: Issue[]
  /** 规划条件的历史轮次 */
  rounds: ConditionRound[]
  access: ProjectAccess
  directory: { email: string; name: string }[]
}) {
  const [project, setProject] = useState(initial)
  const [confirmArchive, setConfirmArchive] = useState(false)
  // 归档后只读：界面按“不能编辑”显示（服务端同样会拒绝修改）
  const archived = !!project.archivedAt
  const edit = access.canEdit && !archived
  const manage = access.canManage && !archived
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tab = (params.get("tab") as Tab | null) ?? "overview"
  const [refs, setRefs] = useState(initialRefs)
  const refCount = refs.length
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
    { value: "issues", label: "问题", count: issues.filter((i) => i.status === "open").length || undefined },
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
          {archived && <Badge variant="outline">已归档</Badge>}
          <AccessBadge access={access} className="ml-auto" />
          <Button asChild variant="outline" size="sm">
            <Link href={`/browse?f=${encodeURIComponent(`proj/${project.id}`)}`}>
              <FolderTreeIcon />
              项目文件
            </Link>
          </Button>
          {access.canManage && !archived && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmArchive(true)} title="项目结束后归档：只读保留，可以恢复">
              <ArchiveIcon />
              归档
            </Button>
          )}
        </div>

        {archived && (
          <div role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-surface-sunken px-4 py-3 text-sm">
            <ArchiveIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              这个项目已于 {new Date(project.archivedAt!).toLocaleDateString("zh-CN")} 归档：所有内容只读保留，不会删除。
            </span>
            {access.canManage && (
              <Button variant="outline" size="sm" onClick={() => save({ archived: false })}>
                <ArchiveRestoreIcon />
                恢复项目
              </Button>
            )}
          </div>
        )}

        <Dialog open={confirmArchive} onOpenChange={setConfirmArchive}>
          <DialogContent>
            <DialogTitle>归档「{project.name}」？</DialogTitle>
            <DialogDescription>
              归档后项目移到列表的“已归档”里，所有内容（文件、依据清单、问题、指标）只读保留，随时可以恢复。项目不能删除。
            </DialogDescription>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmArchive(false)}>
                取消
              </Button>
              <Button onClick={async () => (await save({ archived: true })) && setConfirmArchive(false)}>
                <ArchiveIcon />
                归档
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
          {tab === "overview" && <OverviewTab project={project} refs={refs} canEdit={manage} onSave={save} />}
          {tab === "refs" && <RefsTab projectId={project.id} refs={refs} onRefsChange={setRefs} canEdit={edit} />}
          {tab === "issues" && <IssuesTab issues={issues} />}
          {tab === "checks" && <ChecksTab key={JSON.stringify([project.metrics, project.conditions])} project={project} rounds={rounds} canEdit={edit} onSave={save} />}
          {tab === "members" && <MembersTab project={project} access={{ ...access, canManage: manage }} directory={directory} onSave={save} />}
          {tab === "tools" && <ToolsTab project={project} />}
        </div>
      </div>
    </div>
  )
}

/** 我在这个项目里的权限：放在标题行，进来就知道自己能做什么 */
function AccessBadge({ access, className }: { access: ProjectAccess; className?: string }) {
  const label = access.role ? MEMBER_ROLES[access.role].label : "管理员"
  const title = access.canManage
    ? "可以管理项目、调整成员权限"
    : access.canEdit
      ? "可以浏览和编辑内容；项目信息和成员由负责人管理"
      : "只能查看和下载；需要修改请联系项目负责人"
  return (
    <span title={title} className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
      {access.canEdit ? <PencilIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
      我的权限：<span className="font-medium text-foreground">{label}</span>
      {access.admin && access.role && <span>（管理员）</span>}
    </span>
  )
}
