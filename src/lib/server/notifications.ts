import type { AppNotification } from "@/lib/notifications"
import { collection } from "./db"
import { mentionEmail, sendEmail } from "./email"
import { findMember } from "./members"

/**
 * 站内通知 + 邮件（已定：只通知被 @ 的人，不群发）。
 * 站内：侧栏的铃铛；邮件：配置了 Resend 才发，没配置只记日志。
 */
const store = collection<AppNotification>("notifications")

export function listNotifications(email: string, limit = 50) {
  const all = store
    .values()
    .filter((n) => n.to === email)
    .sort((a, b) => b.at - a.at)
  return { items: all.slice(0, limit), unread: all.filter((n) => !n.readAt).length }
}

export function markRead(email: string, ids?: string[]) {
  const now = Date.now()
  for (const n of store.values()) {
    if (n.to === email && !n.readAt && (!ids || ids.includes(n.id))) store.set(n.id, { ...n, readAt: now })
  }
}

/** 通知被 @ 的人（自己 @ 自己不通知；停用的账号不通知） */
export async function notifyMentions(opts: {
  mentions: string[]
  from: string
  issueLabel: string
  fileName: string
  text: string
  href: string
  origin: string
  /** 是 @全体成员 发出的 */
  everyone?: boolean
}) {
  const fromName = findMember(opts.from)?.name ?? opts.from.split("@")[0]
  for (const to of new Set(opts.mentions)) {
    if (to === opts.from || findMember(to)?.status !== "active") continue
    const n: AppNotification = {
      id: `nt${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      to,
      kind: "mention",
      from: opts.from,
      fromName,
      title: opts.everyone ? `${fromName} 在问题 ${opts.issueLabel} 里提醒了项目全体成员` : `${fromName} 在问题 ${opts.issueLabel} 里提到了你`,
      text: opts.text.slice(0, 200),
      href: opts.href,
      at: Date.now(),
    }
    store.set(n.id, n)
    // 邮件：没配置 Resend 时只记日志；发送失败不影响站内通知
    sendEmail({ to, ...mentionEmail({ from: fromName, issue: opts.issueLabel, fileName: opts.fileName, text: opts.text, link: opts.origin + opts.href }) }).catch(() => {})
  }
}
