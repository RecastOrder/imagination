"use client"

import { useState } from "react"
import { CheckIcon, EyeOffIcon, RotateCcwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Meter } from "@/components/ui/meter"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import {
  COLLECTIONS,
  COLLECTION_ORDER,
  FEATURES,
  FEATURE_ORDER,
  ROLES,
  ROLE_ORDER,
  resolve,
  type Collection,
  type Feature,
  type Member,
} from "@/lib/auth/permissions"
import { cn } from "@/lib/utils"

/**
 * 编辑成员权限。先改“草稿”，点保存才生效（权限是高风险操作，不做即时生效）。
 * 每个开关都标明是“沿用模板”还是“单独调整”，单独调整的可以一键恢复。
 */
export function MemberSheet({
  member,
  onClose,
  onSave,
}: {
  member: Member | null
  onClose: () => void
  onSave: (m: Member) => void
}) {
  return (
    <Sheet open={!!member} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[min(100%,30rem)] p-0">
        {member && <Editor key={member.id} member={member} onClose={onClose} onSave={onSave} />}
      </SheetContent>
    </Sheet>
  )
}

function Editor({ member, onClose, onSave }: { member: Member; onClose: () => void; onSave: (m: Member) => void }) {
  const [draft, setDraft] = useState<Member>(member)
  const r = resolve(draft)
  const template = ROLES[draft.role]
  const dirty = JSON.stringify(draft) !== JSON.stringify(member)

  const setFeature = (f: Feature, on: boolean) => {
    const base = template.features.includes(f)
    const next = { ...draft.featureOverrides }
    if (on === base) delete next[f]
    else next[f] = on
    setDraft({ ...draft, featureOverrides: next })
  }

  const toggleCollection = (c: Collection) => {
    const cur = r.collections
    const next = cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]
    const same = next.length === template.collections.length && next.every((x) => template.collections.includes(x))
    setDraft({ ...draft, collections: same ? undefined : COLLECTION_ORDER.filter((x) => next.includes(x)) })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
            {draft.name.slice(0, 1)}
          </span>
          <div>
            <SheetTitle>{draft.name}</SheetTitle>
            <SheetDescription>{draft.dept}</SheetDescription>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-5">
        {/* 1. 角色模板 */}
        <section>
          <h3 className="text-sm font-semibold">角色模板</h3>
          <p className="mt-0.5 mb-3 text-xs text-muted-foreground">先选最接近的模板，再对个别权限单独调整</p>
          <div role="radiogroup" aria-label="角色模板" className="grid grid-cols-2 gap-2">
            {ROLE_ORDER.map((id) => {
              const t = ROLES[id]
              const on = draft.role === id
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setDraft({ ...draft, role: id, featureOverrides: {}, collections: undefined, quota: undefined })}
                  className={cn(
                    "cursor-pointer rounded-lg border p-3 text-left transition-colors hover:border-border-strong",
                    on && "border-primary bg-primary-subtle/50 hover:border-primary",
                  )}
                >
                  <span className="flex items-center justify-between text-sm font-medium">
                    {t.label}
                    {on && <CheckIcon className="size-4 text-primary" />}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{t.desc}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* 2. 功能 */}
        <section>
          <h3 className="text-sm font-semibold">功能</h3>
          <ul className="mt-3 divide-y rounded-lg border">
            {FEATURE_ORDER.map((f) => {
              const { label, desc, icon: Icon } = FEATURES[f]
              const st = r.features[f]
              return (
                <li key={f} className="flex items-center gap-3 px-3 py-2.5">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {st.overridden ? (
                        <span className="inline-flex items-center gap-1 text-primary">
                          已单独{st.on ? "开通" : "关闭"}
                          <button
                            type="button"
                            onClick={() => setFeature(f, !st.on)}
                            className="inline-flex cursor-pointer items-center gap-0.5 underline-offset-2 hover:underline"
                          >
                            <RotateCcwIcon className="size-3" />
                            恢复模板
                          </button>
                        </span>
                      ) : (
                        <>沿用模板 · {desc}</>
                      )}
                    </p>
                  </div>
                  <Switch checked={st.on} onCheckedChange={(v) => setFeature(f, v)} aria-label={label} />
                </li>
              )
            })}
          </ul>
        </section>

        {/* 3. 资料范围 */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            资料范围
            {r.collectionsOverridden && <span className="text-xs font-normal text-primary">已单独调整</span>}
          </h3>
          <p className="mt-0.5 mb-3 text-xs text-muted-foreground">决定此人在资料库和 AI 回答中能看到哪些资料</p>
          <div className="flex flex-wrap gap-2">
            {COLLECTION_ORDER.map((c) => {
              const on = r.collections.includes(c)
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleCollection(c)}
                  className={cn(
                    "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm transition-colors hover:border-border-strong",
                    on && "border-primary bg-primary-subtle text-primary-subtle-foreground hover:border-primary",
                  )}
                >
                  {on && <CheckIcon className="size-3.5" />}
                  {COLLECTIONS[c].label}
                </button>
              )
            })}
          </div>
        </section>

        {/* 4. 配额 */}
        <section>
          <h3 className="text-sm font-semibold">配额与用量</h3>
          <div className="mt-3 space-y-4">
            <QuotaRow label="存储空间" used={draft.usage.storageGB} max={r.quota.storageGB} unit="GB" />
            <QuotaRow label="本月 AI 次数" used={draft.usage.aiThisMonth} max={r.quota.aiPerMonth} unit="次" />
          </div>
        </section>

        {/* 5. 效果预览：这个人登录后看到什么 */}
        <section>
          <h3 className="text-sm font-semibold">该成员看到的侧栏</h3>
          <p className="mt-0.5 mb-3 text-xs text-muted-foreground">没有权限的功能不出现在导航里；通过链接误入时会看到“无权限”说明页</p>
          <div className="rounded-lg border bg-sidebar p-2">
            {FEATURE_ORDER.map((f) => {
              const { label, icon: Icon } = FEATURES[f]
              const on = r.features[f].on
              return (
                <div
                  key={f}
                  className={cn("flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm", !on && "text-muted-foreground/60 line-through")}
                >
                  {on ? <Icon className="size-4" /> : <EyeOffIcon className="size-4" />}
                  {label}
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <div className="flex items-center gap-2 border-t px-5 py-3">
        {dirty && <span className="text-xs text-warning">有未保存的修改</span>}
        <Button variant="ghost" className="ml-auto" onClick={onClose}>
          取消
        </Button>
        <Button
          disabled={!dirty}
          onClick={() => {
            onSave(draft)
            toast(`已更新 ${draft.name} 的权限（演示）`)
          }}
        >
          保存
        </Button>
      </div>
    </div>
  )
}

function QuotaRow({ label, used, max, unit }: { label: string; used: number; max: number; unit: string }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {max ? `${used} / ${max} ${unit}` : "未开通"}
        </span>
      </div>
      <Meter value={used} max={max} label={label} />
    </div>
  )
}
