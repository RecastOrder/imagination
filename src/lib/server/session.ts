import { findMember } from "./members"

/**
 * 登录会话。
 *
 * Cookie 里只放“会话编号.过期时间.签名”；会话的详细信息（谁、哪类设备、何时登录）存在服务器。
 * 这样服务器可以随时让某个会话作废——比如同类设备上有了新的登录。
 * 签名用 HMAC-SHA256 + 服务器密钥，Cookie 设为 httpOnly，页面脚本读不到。
 * 演示版会话存在内存里，服务重启后所有人需要重新登录；上线时换成 Redis / 数据库。
 */
export const SESSION_COOKIE = "im_session"
export const LAST_EMAIL_COOKIE = "im_last_email"
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 天（已定）

/**
 * 设备策略（已定）：每个账户同时最多 1 台手机 + 1 台电脑。
 * 同一类设备上再登录，之前那台自动退出。
 * 若改成“任何新登录都让其他设备全部退出”，把 SINGLE_SESSION_PER_ACCOUNT 设为 true。
 */
export const MAX_SESSIONS_PER_DEVICE_TYPE = 1
export const SINGLE_SESSION_PER_ACCOUNT = false

const SECRET = process.env.AUTH_SECRET ?? "dev-only-secret-please-set-AUTH_SECRET"

export type DeviceType = "mobile" | "desktop"
export type EndReason = "replaced" | "signed_out" | "revoked" | "disabled"

export interface SessionRecord {
  sid: string
  email: string
  device: DeviceType
  userAgent: string
  createdAt: number
  lastSeenAt: number
  endedAt?: number
  endReason?: EndReason
}

const g = globalThis as unknown as { __sessions?: Map<string, SessionRecord> }
const store = (g.__sessions ??= new Map())

const enc = new TextEncoder()
async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  return Buffer.from(await crypto.subtle.sign("HMAC", key, enc.encode(data))).toString("base64url")
}

export function deviceTypeOf(userAgent: string): DeviceType {
  return /Mobi|Android|iPhone|iPad|HarmonyOS/i.test(userAgent) ? "mobile" : "desktop"
}

/** 新建会话，并按设备策略让旧会话作废。返回令牌和被挤下线的设备 */
export async function createSession(email: string, userAgent: string) {
  const device = deviceTypeOf(userAgent)
  const now = Date.now()
  const active = [...store.values()]
    .filter((s) => s.email === email && !s.endedAt && (SINGLE_SESSION_PER_ACCOUNT || s.device === device))
    .sort((a, b) => b.createdAt - a.createdAt)
  const keep = SINGLE_SESSION_PER_ACCOUNT ? 0 : MAX_SESSIONS_PER_DEVICE_TYPE - 1
  const replaced = active.slice(keep)
  for (const s of replaced) Object.assign(s, { endedAt: now, endReason: "replaced" as EndReason })

  const sid = crypto.randomUUID()
  store.set(sid, { sid, email, device, userAgent, createdAt: now, lastSeenAt: now })
  const exp = Math.floor(now / 1000) + SESSION_MAX_AGE
  const body = `${sid}.${exp}`
  return { token: `${body}.${await hmac(body)}`, replaced: replaced.map((s) => s.device) }
}

export type SessionCheck =
  | { ok: true; session: SessionRecord }
  | { ok: false; reason: EndReason | "invalid" | "expired" | "none" }

/** 校验令牌：签名、过期时间、会话是否仍有效、成员是否被停用 */
export async function checkSession(token: string | undefined): Promise<SessionCheck> {
  if (!token) return { ok: false, reason: "none" }
  const parts = token.split(".")
  if (parts.length !== 3) return { ok: false, reason: "invalid" }
  const [sid, expPart, sig] = parts
  if ((await hmac(`${sid}.${expPart}`)) !== sig) return { ok: false, reason: "invalid" }
  if (Number(expPart) * 1000 < Date.now()) return { ok: false, reason: "expired" }
  const s = store.get(sid)
  if (!s) return { ok: false, reason: "invalid" }
  if (s.endedAt) return { ok: false, reason: s.endReason ?? "revoked" }
  if (findMember(s.email)?.status === "disabled") {
    Object.assign(s, { endedAt: Date.now(), endReason: "disabled" as EndReason })
    return { ok: false, reason: "disabled" }
  }
  s.lastSeenAt = Date.now()
  return { ok: true, session: s }
}

export function endSession(sid: string, reason: EndReason) {
  const s = store.get(sid)
  if (s && !s.endedAt) Object.assign(s, { endedAt: Date.now(), endReason: reason })
}

export function listActiveSessions(email: string) {
  return [...store.values()].filter((s) => s.email === email && !s.endedAt).sort((a, b) => b.lastSeenAt - a.lastSeenAt)
}

export function getSession(sid: string) {
  return store.get(sid)
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production" && process.env.AUTH_INSECURE_COOKIE !== "1",
  path: "/",
  maxAge: SESSION_MAX_AGE,
}
