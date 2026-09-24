"use client"

import { useState } from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ACCESS_LEVELS, type AccessLevel } from "@/lib/access"
import { MEMBER_ROLES, MEMBER_ROLE_ORDER, type MemberRole } from "@/lib/projects/types"
import { cn } from "@/lib/utils"

/**
 * 权限下拉（参考 Google Drive / Figma 的共享面板）：
 * 按钮上只显示档位名；展开后每一档都带一句“能做什么”，选之前就知道后果。
 * 原生 <select> 放不下说明文字，所以用弹出菜单。
 */
export function AccessMenu<T extends string>({
  value,
  onChange,
  options,
  label,
  disabled = [],
  disabledHint,
  readOnly,
}: {
  value: T
  onChange?: (v: T) => void
  options: { value: T; label: string; desc: string }[]
  /** 给读屏软件的名字，如“李娜 的权限” */
  label: string
  disabled?: T[]
  disabledHint?: string
  /** 只显示当前档位（没有管理权限的人看到的样子） */
  readOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)
  if (readOnly || !onChange)
    return <span className="shrink-0 px-2 text-sm text-muted-foreground" aria-label={label}>{current?.label}</span>
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}：${current?.label}`}
          className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 text-sm hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none aria-expanded:bg-accent"
        >
          {current?.label}
          <ChevronDownIcon className="size-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-1">
        <div role="listbox" aria-label={label}>
          {options.map((o) => {
            const off = disabled.includes(o.value)
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                disabled={off}
                title={off ? disabledHint : undefined}
                onClick={() => {
                  setOpen(false)
                  if (o.value !== value) onChange(o.value)
                }}
                className={cn(
                  "flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
                )}
              >
                <CheckIcon className={cn("mt-0.5 size-3.5 shrink-0 text-primary", o.value !== value && "invisible")} />
                <span>
                  <span className="block text-sm font-medium">{o.label}</span>
                  <span className="block text-xs text-muted-foreground">{off && disabledHint ? disabledHint : o.desc}</span>
                </span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

const ROLE_OPTIONS = MEMBER_ROLE_ORDER.map((r) => ({ value: r, label: MEMBER_ROLES[r].label, desc: MEMBER_ROLES[r].desc }))
const LEVEL_OPTIONS = (["view", "edit"] as AccessLevel[]).map((l) => ({ value: l, ...ACCESS_LEVELS[l] }))

/** 项目角色：负责人 / 可编辑 / 仅浏览 */
export function RoleSelect({ disabledRoles, ...props }: {
  value: MemberRole
  onChange?: (r: MemberRole) => void
  label: string
  disabledRoles?: MemberRole[]
  disabledHint?: string
  readOnly?: boolean
}) {
  return <AccessMenu {...props} options={ROLE_OPTIONS} disabled={disabledRoles} />
}

/** 共享档位：仅浏览 / 浏览 + 编辑（个人文件共享用） */
export function LevelSelect(props: { value: AccessLevel; onChange?: (l: AccessLevel) => void; label: string }) {
  return <AccessMenu {...props} options={LEVEL_OPTIONS} />
}
