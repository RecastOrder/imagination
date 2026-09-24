import { CheckIcon, MinusIcon } from "lucide-react"

import { COLLECTIONS, COLLECTION_ORDER, FEATURES, FEATURE_ORDER, ROLES, ROLE_ORDER } from "@/lib/auth/permissions"
import { cn } from "@/lib/utils"

/** 权限矩阵：行 = 权限项，列 = 角色模板。一眼看清“谁能干什么” */
export function RoleMatrix() {
  return (
    <div className="overflow-x-auto rounded-xl border bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b">
            <th className="w-48 px-4 py-3 text-left text-xs font-medium text-muted-foreground">权限项</th>
            {ROLE_ORDER.map((r) => (
              <th key={r} className="px-3 py-3 text-center">
                <span className="block font-medium">{ROLES[r].label}</span>
                <span className="block text-xs font-normal text-muted-foreground">{ROLES[r].desc}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <GroupRow label="功能" />
          {FEATURE_ORDER.map((f) => {
            const { label, icon: Icon } = FEATURES[f]
            return (
              <tr key={f} className="border-b last:border-0">
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    {label}
                  </span>
                </td>
                {ROLE_ORDER.map((r) => (
                  <Cell key={r} on={ROLES[r].features.includes(f)} />
                ))}
              </tr>
            )
          })}
          <GroupRow label="资料范围" />
          {COLLECTION_ORDER.map((c) => (
            <tr key={c} className="border-b">
              <td className="px-4 py-2.5">{COLLECTIONS[c].label}</td>
              {ROLE_ORDER.map((r) => (
                <Cell key={r} on={ROLES[r].collections.includes(c)} />
              ))}
            </tr>
          ))}
          <GroupRow label="配额" />
          <tr className="border-b">
            <td className="px-4 py-2.5">存储空间</td>
            {ROLE_ORDER.map((r) => (
              <td key={r} className="px-3 py-2.5 text-center tabular-nums">
                {ROLES[r].quota.storageGB ? `${ROLES[r].quota.storageGB} GB` : "—"}
              </td>
            ))}
          </tr>
          <tr>
            <td className="px-4 py-2.5">AI 次数 / 月</td>
            {ROLE_ORDER.map((r) => (
              <td key={r} className="px-3 py-2.5 text-center tabular-nums">
                {ROLES[r].quota.aiPerMonth || "—"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function GroupRow({ label }: { label: string }) {
  return (
    <tr className="border-b bg-surface-sunken">
      <td colSpan={ROLE_ORDER.length + 1} className="px-4 py-1.5 text-xs font-medium text-muted-foreground">
        {label}
      </td>
    </tr>
  )
}

function Cell({ on }: { on: boolean }) {
  return (
    <td className="px-3 py-2.5 text-center">
      <span
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full",
          on ? "bg-primary-subtle text-primary" : "text-muted-foreground/50",
        )}
        aria-label={on ? "有" : "无"}
      >
        {on ? <CheckIcon className="size-3.5" strokeWidth={3} /> : <MinusIcon className="size-3.5" />}
      </span>
    </td>
  )
}
