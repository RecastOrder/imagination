/**
 * 登录会话：签名 Cookie（演示版，但做法是真实的）。
 *
 * Cookie 内容 = 邮箱.过期时间.签名；签名用 HMAC-SHA256 + 服务器密钥，
 * 别人改了邮箱，签名就对不上。Cookie 设为 httpOnly，页面脚本读不到，防止被盗用。
 * 用 Web Crypto 实现，proxy 和接口里都能用。
 */
export const SESSION_COOKIE = "im_session"
export const LAST_EMAIL_COOKIE = "im_last_email"
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 天

const SECRET = process.env.AUTH_SECRET ?? "dev-only-secret-please-set-AUTH_SECRET"

const enc = new TextEncoder()
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  Buffer.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).toString("base64url")

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)))
}

export interface Session {
  email: string
  exp: number
}

export async function createSessionToken(email: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE
  const body = `${b64url(enc.encode(email))}.${exp}`
  return `${body}.${await hmac(body)}`
}

export async function readSessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [emailPart, expPart, sig] = parts
  const body = `${emailPart}.${expPart}`
  if ((await hmac(body)) !== sig) return null
  const exp = Number(expPart)
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null
  return { email: Buffer.from(emailPart, "base64url").toString("utf8"), exp }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production" && process.env.AUTH_INSECURE_COOKIE !== "1",
  path: "/",
  maxAge: SESSION_MAX_AGE,
}
