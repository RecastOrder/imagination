import { collection } from "./db"
import { IS_PROD } from "./env"
import { findMember } from "./members"

/**
 * 登录会话。
 *
 * Cookie 里只放“会话编号.过期时间.签名”；会话的详细信息（谁、哪类设备、何时登录）存在服务器。
 * 这样服务器可以随时让某个会话作废——比如同类设备上有了新的登录。
 * 签名用 HMAC-SHA256 + 服务器密钥，Cookie 设为 httpOnly，页面脚本读不到。
 * 会话存在数据库里：服务器重启后大家不用重新登录。
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

const DEV_SECRET = "dev-only-secret-please-set-AUTH_SECRET"
/** 正式服务器必须设置 AUTH_SECRET（至少 32 位随机字符），否则拒绝签发和校验会话 */
function secret() {
  const s = process.env.AUTH_SECRET
  if (s && s.length >= 32) return s
  if (IS_PROD) throw new Error("生产环境必须设置 AUTH_SECRET（至少 32 个字符），见 deploy/.env.example")
  return s || DEV_SECRET
}

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

const store = collection<SessionRecord>("sessions")
/** “最近活动时间”不必每个请求都写库：超过 1 分钟才更新一次 */
const TOUCH_INTERVAL_MS = 60 * 1000

const enc = new TextEncoder()
async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
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

  const sid = crypto.randomUUID()
  const exp = Math.floor(now / 1000) + SESSION_MAX_AGE
  const body = `${sid}.${exp}`
  // 先签名再保存：签名失败（例如没配密钥）时不留下半截会话，也不挤掉旧设备
  const token = `${body}.${await hmac(body)}`
  for (const s of replaced) store.set(s.sid, { ...s, endedAt: now, endReason: "replaced" })
  store.set(sid, { sid, email, device, userAgent, createdAt: now, lastSeenAt: now })
  return { token, replaced: replaced.map((s) => s.device) }
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
    store.set(sid, { ...s, endedAt: Date.now(), endReason: "disabled" })
    return { ok: false, reason: "disabled" }
  }
  const now = Date.now()
  if (now - s.lastSeenAt > TOUCH_INTERVAL_MS) {
    s.lastSeenAt = now
    store.set(sid, s)
  }
  return { ok: true, session: s }
}

export function endSession(sid: string, reason: EndReason) {
  const s = store.get(sid)
  if (s && !s.endedAt) store.set(sid, { ...s, endedAt: Date.now(), endReason: reason })
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
