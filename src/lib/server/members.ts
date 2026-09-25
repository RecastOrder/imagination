import { MEMBERS, ROLES, resolve, type Member, type RoleId } from "@/lib/auth/permissions"
import { collection } from "./db"
import { DEMO_DATA } from "./env"

/**
 * 成员名单（邀请制）：只有名单里的邮箱才能登录。
 * 存在数据库里（db.ts），第一次启动时写入 permissions.ts 里的示例成员。
 */
const seeded = collection<Member>("members", () => (DEMO_DATA ? MEMBERS.map((m) => [m.email, { ...m }]) : []))

/**
 * 第一位管理员：正式服务器上没有演示成员，用环境变量 INITIAL_ADMIN_EMAIL 指定，
 * 启动后这个邮箱就是管理员，可以登录再邀请其他人。
 */
let ensured = false
function members() {
  if (!ensured) {
    ensured = true
    const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase()
    if (email && !seeded.get(email)) {
      seeded.set(email, {
        id: "u-admin",
        email,
        name: email.split("@")[0],
        dept: "",
        role: "admin",
        status: "active",
        featureOverrides: {},
        usage: { storageGB: 0, aiThisMonth: 0 },
        invitedAt: Date.now(),
        invitedBy: "INITIAL_ADMIN_EMAIL",
      })
    }
  }
  return seeded
}

/** 常见个人邮箱域名：邀请时拒绝，要求使用工作单位邮箱 */
export const PERSONAL_MAIL_DOMAINS = [
  "qq.com", "foxmail.com", "163.com", "126.com", "yeah.net", "sina.com", "sina.cn", "sohu.com",
  "139.com", "189.cn", "aliyun.com", "gmail.com", "outlook.com", "hotmail.com", "live.com",
  "yahoo.com", "icloud.com", "me.com", "proton.me", "protonmail.com",
]

export function isPersonalMail(email: string) {
  return PERSONAL_MAIL_DOMAINS.includes(email.split("@")[1] ?? "")
}

export function findMember(email: string): Member | undefined {
  return members().get(email)
}

export function listMembers(): Member[] {
  return [...members().values()].sort((a, b) => (a.invitedAt ?? 0) - (b.invitedAt ?? 0))
}

export function isAdmin(email: string) {
  const m = members().get(email)
  return !!m && m.status !== "disabled" && resolve(m).features.admin.on
}

export type InviteResult = { ok: true; member: Member } | { ok: false; error: string }

export function inviteMember(input: { email: string; name?: string; role: RoleId; invitedBy: string }): InviteResult {
  if (isPersonalMail(input.email)) return { ok: false, error: "这是个人邮箱。平台只接受工作单位邮箱，请换成对方的单位邮箱" }
  if (members().has(input.email)) return { ok: false, error: "这个邮箱已经在成员名单里" }
  if (!ROLES[input.role]) return { ok: false, error: "角色不存在" }
  const member: Member = {
    id: `u${Date.now().toString(36)}`,
    email: input.email,
    name: input.name?.trim() || input.email.split("@")[0],
    dept: "",
    role: input.role,
    status: "invited",
    featureOverrides: {},
    usage: { storageGB: 0, aiThisMonth: 0 },
    invitedAt: Date.now(),
    invitedBy: input.invitedBy,
  }
  members().set(input.email, member)
  return { ok: true, member }
}

/** 管理员修改成员（角色、单独调整、状态）。邮箱和用量不允许通过这里改 */
export function updateMember(email: string, patch: Partial<Member>): Member | null {
  const cur = members().get(email)
  if (!cur) return null
  const next: Member = {
    ...cur,
    name: patch.name ?? cur.name,
    dept: patch.dept ?? cur.dept,
    role: patch.role && ROLES[patch.role] ? patch.role : cur.role,
    status: patch.status ?? cur.status,
    featureOverrides: patch.featureOverrides ?? cur.featureOverrides,
    collections: "collections" in patch ? patch.collections : cur.collections,
    quota: "quota" in patch ? patch.quota : cur.quota,
  }
  members().set(email, next)
  return next
}

/** 撤销邀请：只能撤销还没登录过的 */
export function revokeInvite(email: string): boolean {
  const cur = members().get(email)
  if (!cur || cur.status !== "invited") return false
  members().delete(email)
  return true
}

export function markLogin(email: string) {
  const cur = members().get(email)
  if (!cur) return
  members().set(email, { ...cur, status: cur.status === "invited" ? "active" : cur.status, lastLoginAt: Date.now() })
}
