"use client"

import { useState } from "react"
import { CheckIcon, CopyIcon, MailPlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { toast } from "@/components/ui/toast"
import { ROLES, ROLE_ORDER, type Member, type RoleId } from "@/lib/auth/permissions"
import { cn } from "@/lib/utils"

/**
 * 邀请成员：填工作单位邮箱 + 选角色模板。
 * 个人邮箱（QQ、163、Gmail 等）由服务端拒绝——这条规则写在服务端，界面只负责把原因说清楚。
 */
export function InviteSheet({
  open,
  onOpenChange,
  onInvited,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onInvited: (m: Member) => void
}) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<RoleId>("standard")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [link, setLink] = useState<string | null>(null)

  const reset = () => {
    setEmail("")
    setName("")
    setRole("standard")
    setError(null)
    setLink(null)
  }

  const submit = async () => {
    setPending(true)
    setError(null)
    try {
      const r = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name, role }),
      })
      const data = await r.json()
      if (!r.ok) return setError(data.error ?? "邀请失败")
      onInvited(data.member)
      setLink(`${window.location.origin}${data.inviteLink}`)
    } catch {
      setError("网络连接失败，请重试")
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => (onOpenChange(o), !o && reset())}>
      <SheetContent side="right" className="w-[min(100%,28rem)] p-0">
        <div className="border-b px-5 pt-5 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <MailPlusIcon className="size-4" />
            邀请成员
          </SheetTitle>
          <SheetDescription className="mt-1">平台采用邀请制，只接受对方工作单位的邮箱</SheetDescription>
        </div>

        {link ? (
          <div className="flex-1 space-y-4 px-5 py-6">
            <p className="flex items-center gap-2 font-medium">
              <CheckIcon className="size-4 text-success" />
              已邀请 {email}
            </p>
            <p className="text-sm text-muted-foreground">
              演示环境不会真正发出邀请邮件。把下面的链接发给对方，打开后邮箱已填好，点“登录”收验证码即可。
            </p>
            <div className="flex gap-2">
              <Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
              <Button
                variant="outline"
                size="icon"
                aria-label="复制链接"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link)
                    toast("邀请链接已复制")
                  } catch {
                    toast("复制失败，请手动复制")
                  }
                }}
              >
                <CopyIcon />
              </Button>
            </div>
            <Button variant="secondary" onClick={reset}>
              继续邀请
            </Button>
          </div>
        ) : (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div>
                <label htmlFor="invite-email" className="text-sm font-medium">
                  工作单位邮箱
                </label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError(null)
                  }}
                  placeholder="name@company.com"
                  aria-invalid={!!error || undefined}
                  className="mt-2"
                />
                {error ? (
                  <p role="alert" className="mt-2 text-sm text-destructive">
                    {error}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">不接受 QQ、163、Gmail 等个人邮箱</p>
                )}
              </div>
              <div>
                <label htmlFor="invite-name" className="text-sm font-medium">
                  姓名 <span className="font-normal text-muted-foreground">（可选）</span>
                </label>
                <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-2" />
              </div>
              <fieldset>
                <legend className="text-sm font-medium">角色模板</legend>
                <div role="radiogroup" className="mt-2 grid grid-cols-2 gap-2">
                  {ROLE_ORDER.filter((r) => r !== "guest").map((id) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={role === id}
                      onClick={() => setRole(id)}
                      className={cn(
                        "cursor-pointer rounded-lg border p-3 text-left transition-colors hover:border-border-strong",
                        role === id && "border-primary bg-primary-subtle/50 hover:border-primary",
                      )}
                    >
                      <span className="block text-sm font-medium">{ROLES[id].label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{ROLES[id].desc}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" disabled={pending || !email.trim()}>
                发送邀请
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
