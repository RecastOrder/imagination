import { createHash, randomInt } from "node:crypto"

import { collection } from "./db"
import { EMAIL_CONFIGURED, codeEmail, sendEmail } from "./email"

/**
 * 邮箱验证码（存在数据库里，服务器重启不影响已发出的验证码）。
 *
 * 安全要点：
 * - 只保存验证码的哈希，不保存明文
 * - 10 分钟过期；同一邮箱 60 秒内不能重发
 * - 最多输错 5 次，之后必须重新获取
 */
const TTL_MS = 10 * 60 * 1000
export const RESEND_COOLDOWN_MS = 60 * 1000
const MAX_ATTEMPTS = 5

interface Entry {
  hash: string
  expiresAt: number
  sentAt: number
  attempts: number
}

const store = collection<Entry>("otp")
const sha = (s: string) => createHash("sha256").update(s).digest("hex")

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const email = raw.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null
}

export function issueCode(email: string): { ok: true; code: string } | { ok: false; retryAfter: number } {
  const now = Date.now()
  const prev = store.get(email)
  if (prev && now - prev.sentAt < RESEND_COOLDOWN_MS) {
    return { ok: false, retryAfter: Math.ceil((RESEND_COOLDOWN_MS - (now - prev.sentAt)) / 1000) }
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0")
  store.set(email, { hash: sha(`${email}:${code}`), expiresAt: now + TTL_MS, sentAt: now, attempts: 0 })
  return { ok: true, code }
}

export type VerifyResult = "ok" | "expired" | "wrong" | "too_many" | "missing"

export function verifyCode(email: string, code: string): VerifyResult {
  const e = store.get(email)
  if (!e) return "missing"
  if (Date.now() > e.expiresAt) {
    store.delete(email)
    return "expired"
  }
  if (e.attempts >= MAX_ATTEMPTS) return "too_many"
  if (sha(`${email}:${code}`) !== e.hash) {
    const attempts = e.attempts + 1
    store.set(email, { ...e, attempts })
    return attempts >= MAX_ATTEMPTS ? "too_many" : "wrong"
  }
  store.delete(email) // 验证码只能用一次
  return "ok"
}

/** 发送验证码邮件（Resend，见 email.ts）。返回是否发送成功 */
export async function sendCodeEmail(email: string, code: string) {
  return sendEmail({ to: email, ...codeEmail(code) })
}

/** 邮件发送失败时撤回验证码，让用户可以立即重试 */
export function revokeCode(email: string) {
  store.delete(email)
}

/**
 * 演示模式：把验证码直接显示在登录页上。
 * 默认：没配置 Resend 时开启，配置后关闭；也可以用 AUTH_DEMO=on / off 强制指定。
 */
export const DEMO_SHOW_CODE = process.env.AUTH_DEMO ? process.env.AUTH_DEMO === "on" : !EMAIL_CONFIGURED
