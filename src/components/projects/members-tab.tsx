"use client"

import { useState } from "react"
import { UserPlusIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { RoleSelect } from "@/components/share/access-menu"
import { MEMBER_ROLES, MEMBER_ROLE_ORDER, type MemberRole, type Project, type ProjectAccess, type ProjectMember } from "@/lib/projects/types"

/**
 * 项目成员：由项目负责人从单位成员里拉人，并给每个人定权限（已定）。
 *   负责人 —— 管理项目和成员权限
 *   可编辑 —— 浏览 + 编辑内容
 *   仅浏览 —— 只能查看、下载
 * 被拉进项目的人，才能在“文件浏览 · 项目”里看到这个项目的文件。
 */
export function MembersTab({
  project,
  access,
  directory,
  onSave,
}: {
  project: Project
  access: ProjectAccess
  /** 单位成员（负责人拉人时可选） */
  directory: { email: string; name: string }[]
  onSave: (patch: { members: ProjectMember[] }) => Promise<boolean>
}) {
  const [adding, setAdding] = useState("")
  const [addRole, setAddRole] = useState<MemberRole>("editor")
  const canManage = access.canManage
  const nameOf = (email: string) => directory.find((d) => d.email === email)?.name ?? email.split("@")[0]
  const candidates = directory.filter((d) => !project.members.some((m) => m.email === d.email))
  const leads = project.members.filter((m) => m.role === "lead").length
  // 按角色排序：负责人在前，一眼看出谁管事
  const members = [...project.members].sort((a, b) => MEMBER_ROLE_ORDER.indexOf(a.role) - MEMBER_ROLE_ORDER.indexOf(b.role))

  const save = (members: ProjectMember[]) => onSave({ members })
  const setRole = (email: string, role: MemberRole) => save(project.members.map((x) => (x.email === email ? { ...x, role } : x)))

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {canManage
            ? access.role === "lead"
              ? "你是项目负责人：可以拉人进项目，并调整每个人的权限。"
              : "你是管理员：可以管理任何项目的成员和权限。"
            : "成员和权限由项目负责人管理。"}
        </p>
        <ul className="divide-y rounded-xl border bg-surface">
          {members.map((m) => {
            const lastLead = m.role === "lead" && leads === 1
            return (
              <li key={m.email} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">{nameOf(m.email).slice(0, 1)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{nameOf(m.email)}</span>
                  <span className="block truncate text-xs text-muted-foreground">{m.email}</span>
                </span>
                {canManage ? (
                  <>
                    <RoleSelect
                      value={m.role}
                      onChange={(r) => setRole(m.email, r)}
                      label={`${nameOf(m.email)} 的权限`}
                      // 最后一位负责人不能降级：项目必须有人管
                      disabledRoles={lastLead ? ["editor", "viewer"] : []}
                      disabledHint="项目至少要有一位负责人"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={lastLead}
                      title={lastLead ? "项目至少要有一位负责人" : undefined}
                      aria-label={`移出 ${nameOf(m.email)}`}
                      onClick={() => save(project.members.filter((x) => x.email !== m.email))}
                    >
                      <XIcon />
                    </Button>
                  </>
                ) : (
                  <RoleSelect value={m.role} label={`${nameOf(m.email)} 的权限`} readOnly />
                )}
              </li>
            )
          })}
        </ul>
        {canManage && (
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!adding) return
              save([...project.members, { email: adding, role: addRole }]).then((ok) => ok && setAdding(""))
            }}
          >
            <select
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              aria-label="选择要加入的单位成员"
              className="h-9 min-w-0 flex-1 basis-56 rounded-md border border-input bg-surface px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
            >
              <option value="">从单位成员中选择…</option>
              {candidates.map((c) => (
                <option key={c.email} value={c.email}>
                  {c.name}（{c.email}）
                </option>
              ))}
            </select>
            <RoleSelect value={addRole} onChange={setAddRole} label="新成员的权限" />
            <Button type="submit" disabled={!adding}>
              <UserPlusIcon />
              拉进项目
            </Button>
          </form>
        )}
        {canManage && <p className="text-xs text-muted-foreground">名单里没有的人，需要先请管理员用工作邮箱邀请加入单位。</p>}
      </div>

      {/* 权限说明：放在旁边而不是藏进提示框——负责人分配权限时正好需要对照 */}
      <aside aria-label="权限说明" className="h-fit rounded-xl border bg-surface-sunken/60 p-4 text-sm">
        <p className="font-medium">三档权限</p>
        <dl className="mt-3 space-y-3">
          {MEMBER_ROLE_ORDER.map((r) => (
            <div key={r}>
              <dt className="font-medium">{MEMBER_ROLES[r].label}</dt>
              <dd className="mt-0.5 text-muted-foreground">{ROLE_DETAIL[r]}</dd>
            </div>
          ))}
          <div>
            <dt className="font-medium">管理员</dt>
            <dd className="mt-0.5 text-muted-foreground">不必是成员，对所有项目都有负责人的权限。</dd>
          </div>
        </dl>
      </aside>
    </div>
  )
}

const ROLE_DETAIL: Record<MemberRole, string> = {
  lead: "修改位置、阶段；拉人、移出、调整每个人的权限；以及编辑内容。",
  editor: "改设计指标、增删依据清单、标注和测量、上传项目文件。",
  viewer: "查看项目和文件、下载；不能修改任何内容。",
}
