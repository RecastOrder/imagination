import { MEMBERS, ROLES, resolve, type Member, type RoleId } from "@/lib/auth/permissions"
import { currentRoster, rosterEnabled, rosterRole } from "./cairn-roster"
import { collection } from "./db"
import { getPrefs } from "./prefs"
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

/**
 * 名单由 Cairn 管理时（ROSTER_SOURCE=cairn）：在 Cairn 名单上 ⇒ 是成员（第一次用到时在本库建一条，
 * 只存本平台自己的设置）；Cairn owner ⇒ 管理员，其余 ⇒ 不是管理员；不在名单上 ⇒ 不是成员（即使本库有旧记录）。
 * 名单从来没拿到过 ⇒ 只认 INITIAL_ADMIN_EMAIL，免得 Cairn 一时连不上就谁都进不来、又不至于放所有人进来
 * （这也意味着：第一次启动就连不上 Cairn 时，其他人的会话会被结束 —— 有意 fail closed）。
 */
function rosterMember(email: string): Member | undefined {
  const e = email.trim().toLowerCase()
  const role = rosterRole(e)
  if (role === undefined) return e === process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase() ? members().get(e) : undefined
  if (role === null) return undefined
  let m = members().get(e)
  if (!m) {
    m = {
      id: `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      email: e,
      name: e.split("@")[0],
      dept: "",
      role: role === "owner" ? "admin" : "standard",
      status: "invited",
      featureOverrides: {},
      usage: { storageGB: 0, aiThisMonth: 0 },
      invitedAt: Date.now(),
      invitedBy: "Cairn 名单",
    }
    members().set(e, m)
  } else if ((role === "owner") !== (m.role === "admin") || "admin" in (m.featureOverrides ?? {})) {
    // 管理员身份跟着 Cairn 的 owner 走，两个方向都跟；本平台对“管理”这一项的单独调整
    // 会绕过这条规则（owner 被关掉管理 / 非 owner 被打开管理），所以一并去掉
    const { admin: _drop, ...rest } = (m.featureOverrides ?? {}) as Record<string, boolean>
    void _drop
    m = { ...m, role: role === "owner" ? "admin" : "standard", featureOverrides: rest }
    members().set(e, m)
  }
  return m
}

export function findMember(email: string): Member | undefined {
  return rosterEnabled() ? rosterMember(email) : members().get(email)
}

export function listMembers(): Member[] {
  const r = rosterEnabled() ? currentRoster() : undefined
  const emails = r
    ? [...r.owners, ...r.members]
    : rosterEnabled()
      ? [...members().values()].map((m) => m.email) // 名单还没拿到过：rosterMember 只会放行 INITIAL_ADMIN_EMAIL
      : null
  const all = emails
    ? [...new Set(emails)].map((e) => rosterMember(e)).filter((m): m is Member => !!m)
    : [...members().values()]
  return all.sort((a, b) => (a.invitedAt ?? 0) - (b.invitedAt ?? 0))
}

/** 真正的管理员（不看对比视角）。只用于“能不能打开 / 关闭对比视角”这一件事 */
export function isRealAdmin(email: string) {
  const m = findMember(email)
  return !!m && m.status !== "disabled" && resolve(m).features.admin.on
}

/**
 * 管理员对比视角：打开时按一个“刚被邀请的普通成员”看待 —— resolve() 读的四样全部换成普通成员的默认值
 * （角色、单独调整、可见资料范围、用量额度），否则会带着管理员自己的范围去看，对比就不准。
 */
export function asViewedMember(m: Member): Member {
  return { ...m, role: "standard", featureOverrides: {}, collections: undefined, quota: undefined }
}

export function viewingAsMember(email: string) {
  return isRealAdmin(email) && getPrefs(email).viewAsMember
}

export function isAdmin(email: string) {
  if (viewingAsMember(email)) return false
  const m = findMember(email)
  return !!m && m.status !== "disabled" && resolve(m).features.admin.on
}

export type InviteResult = { ok: true; member: Member } | { ok: false; error: string }

export function inviteMember(input: { email: string; name?: string; role: RoleId; invitedBy: string }): InviteResult {
  if (rosterEnabled()) {
    return { ok: false, error: "成员名单由 Cairn 管理：请在 Cairn 的名单里加人，这里一分钟内会同步过来" }
  }
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
