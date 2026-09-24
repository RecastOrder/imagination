"use client"

import { useState } from "react"
import { SearchIcon, UserPlusIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Meter } from "@/components/ui/meter"
import { Segmented } from "@/components/ui/segmented"
import { toast } from "@/components/ui/toast"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  FEATURES,
  FEATURE_ORDER,
  MEMBERS,
  ROLES,
  ROLE_ORDER,
  overrideCount,
  resolve,
  type Member,
  type RoleId,
} from "@/lib/auth/permissions"
import { cn } from "@/lib/utils"
import { MemberSheet } from "./member-sheet"
import { RoleMatrix } from "./role-matrix"

const STATUS: Record<Member["status"], { label: string; cls: string }> = {
  active: { label: "正常", cls: "text-success" },
  invited: { label: "已邀请", cls: "text-muted-foreground" },
  disabled: { label: "已停用", cls: "text-muted-foreground" },
}

/**
 * 成员与权限（管理员）。
 * - 成员：列表一眼看出“谁是什么角色、能用哪些功能、用量是否快满”
 * - 角色模板：权限矩阵
 */
export function MembersView() {
  const [tab, setTab] = useState<"members" | "roles">("members")
  const [members, setMembers] = useState(MEMBERS)
  const [editing, setEditing] = useState<Member | null>(null)
  const [q, setQ] = useState("")
  const [role, setRole] = useState<RoleId | "all">("all")

  const list = members.filter(
    (m) => (role === "all" || m.role === role) && (!q || (m.name + m.dept).includes(q.trim())),
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">成员与权限</h1>
            <p className="mt-1 text-sm text-muted-foreground">角色模板决定默认权限，个别成员可以单独调整。</p>
          </div>
          <Button onClick={() => toast("演示：将发送邀请链接，受邀人登录后自动套用所选角色模板")}>
            <UserPlusIcon />
            邀请成员
          </Button>
        </div>

        <Segmented
          label="视图"
          className="mt-6"
          value={tab}
          onChange={setTab}
          options={[
            { value: "members", label: `成员 ${members.length}` },
            { value: "roles", label: "角色模板" },
          ]}
        />

        {tab === "roles" ? (
          <div className="mt-6">
            <RoleMatrix />
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="姓名或部门" className="pl-9" />
              </div>
              <div className="flex flex-wrap gap-1">
                {(["all", ...ROLE_ORDER] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    aria-pressed={role === r}
                    className={cn(
                      "h-8 cursor-pointer rounded-md px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                      role === r && "bg-secondary font-medium text-foreground",
                    )}
                  >
                    {r === "all" ? "全部" : ROLES[r].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border bg-surface">
              {/* 表头只在桌面显示；手机上每行变成卡片 */}
              <div className="hidden grid-cols-[1.4fr_1fr_1.3fr_1fr_0.6fr] gap-4 border-b px-4 py-2.5 text-xs font-medium text-muted-foreground md:grid">
                <span>成员</span>
                <span>角色</span>
                <span>可用功能</span>
                <span>存储用量</span>
                <span>状态</span>
              </div>
              <ul className="divide-y">
                {list.map((m) => {
                  const r = resolve(m)
                  const n = overrideCount(m)
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setEditing(m)}
                        className={cn(
                          "grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 text-left transition-colors hover:bg-accent/50 md:grid-cols-[1.4fr_1fr_1.3fr_1fr_0.6fr]",
                          m.status === "disabled" && "opacity-60",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                            {m.name.slice(0, 1)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{m.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{m.dept}</span>
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5 justify-self-end md:justify-self-start">
                          <Badge variant={m.role === "admin" ? "primary" : "neutral"}>{ROLES[m.role].label}</Badge>
                          {n > 0 && (
                            <span className="text-xs text-primary" title="有单独调整的权限">
                              +{n} 调整
                            </span>
                          )}
                        </span>
                        <span className="col-span-2 flex gap-1 md:col-span-1">
                          {FEATURE_ORDER.map((f) => {
                            const { label, icon: Icon } = FEATURES[f]
                            const on = r.features[f].on
                            return (
                              <Tooltip key={f}>
                                <TooltipTrigger asChild>
                                  <span
                                    className={cn(
                                      "flex size-7 items-center justify-center rounded-md",
                                      on ? "bg-secondary text-foreground" : "text-muted-foreground/35",
                                    )}
                                  >
                                    <Icon className="size-3.5" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {label}：{on ? "可用" : "不可用"}
                                  {r.features[f].overridden && "（单独调整）"}
                                </TooltipContent>
                              </Tooltip>
                            )
                          })}
                        </span>
                        <span className="hidden md:block">
                          <span className="mb-1 block text-xs text-muted-foreground tabular-nums">
                            {r.quota.storageGB ? `${m.usage.storageGB} / ${r.quota.storageGB} GB` : "未开通"}
                          </span>
                          <Meter value={m.usage.storageGB} max={r.quota.storageGB} label="存储用量" />
                        </span>
                        <span className={cn("hidden text-sm md:block", STATUS[m.status].cls)}>{STATUS[m.status].label}</span>
                      </button>
                    </li>
                  )
                })}
                {list.length === 0 && <li className="px-4 py-12 text-center text-sm text-muted-foreground">没有符合条件的成员</li>}
              </ul>
            </div>
          </>
        )}
      </div>

      <MemberSheet
        member={editing}
        onClose={() => setEditing(null)}
        onSave={(m) => {
          setMembers((ms) => ms.map((x) => (x.id === m.id ? m : x)))
          setEditing(null)
        }}
      />
    </div>
  )
}
