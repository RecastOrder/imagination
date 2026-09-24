"use client"

import { useState } from "react"
import { CrownIcon, UserPlusIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Project, ProjectMember } from "@/lib/projects/types"

/**
 * 项目成员：由项目负责人从单位成员里拉人（已定）。
 * 被拉进项目的人，才能在“文件浏览 · 项目”里看到这个项目的文件。
 */
export function MembersTab({
  project,
  canEdit,
  directory,
  onSave,
}: {
  project: Project
  canEdit: boolean
  /** 单位成员（负责人拉人时可选） */
  directory: { email: string; name: string }[]
  onSave: (patch: { members: ProjectMember[] }) => Promise<boolean>
}) {
  const [adding, setAdding] = useState("")
  const nameOf = (email: string) => directory.find((d) => d.email === email)?.name ?? email.split("@")[0]
  const candidates = directory.filter((d) => !project.members.some((m) => m.email === d.email))
  const leads = project.members.filter((m) => m.role === "lead").length

  const save = (members: ProjectMember[]) => onSave({ members })

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground">
        {canEdit ? "你是项目负责人，可以拉人进项目、调整负责人。" : "只有项目负责人可以调整成员。"}
      </p>
      <ul className="divide-y rounded-xl border bg-surface">
        {project.members.map((m) => (
          <li key={m.email} className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold">{nameOf(m.email).slice(0, 1)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{nameOf(m.email)}</span>
              <span className="block truncate text-xs text-muted-foreground">{m.email}</span>
            </span>
            {m.role === "lead" ? (
              <Badge variant="primary">
                <CrownIcon />
                负责人
              </Badge>
            ) : (
              <Badge>成员</Badge>
            )}
            {canEdit && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={m.role === "lead" && leads === 1}
                  title={m.role === "lead" && leads === 1 ? "项目至少要有一位负责人" : undefined}
                  onClick={() => save(project.members.map((x) => (x.email === m.email ? { ...x, role: x.role === "lead" ? "member" : "lead" } : x)))}
                >
                  {m.role === "lead" ? "设为成员" : "设为负责人"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={m.role === "lead" && leads === 1}
                  aria-label={`移出 ${nameOf(m.email)}`}
                  onClick={() => save(project.members.filter((x) => x.email !== m.email))}
                >
                  <XIcon />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!adding) return
            save([...project.members, { email: adding, role: "member" }]).then((ok) => ok && setAdding(""))
          }}
        >
          <select
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            aria-label="选择要加入的单位成员"
            className="h-9 flex-1 rounded-md border border-input bg-surface px-2 text-sm outline-none focus-visible:border-ring"
          >
            <option value="">从单位成员中选择…</option>
            {candidates.map((c) => (
              <option key={c.email} value={c.email}>
                {c.name}（{c.email}）
              </option>
            ))}
          </select>
          <Button type="submit" disabled={!adding}>
            <UserPlusIcon />
            拉进项目
          </Button>
        </form>
      )}
      {canEdit && <p className="text-xs text-muted-foreground">名单里没有的人，需要先请管理员用工作邮箱邀请加入单位。</p>}
    </div>
  )
}
