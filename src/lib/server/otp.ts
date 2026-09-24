import { createHash, randomInt } from "node:crypto"

/**
 * 邮箱验证码（演示版：存在服务器内存里，重启即清空；上线时换成 Redis 或数据库）。
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

const g = globalThis as unknown as { __otp?: Map<string, Entry> }
const store = (g.__otp ??= new Map())
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
    e.attempts++
    return e.attempts >= MAX_ATTEMPTS ? "too_many" : "wrong"
  }
  store.delete(email) // 验证码只能用一次
  return "ok"
}

/** 发送邮件。演示环境不真正发送，接入邮件服务（如阿里云邮件推送、SendGrid）后在这里实现 */
export async function sendCodeEmail(email: string, code: string) {
  console.info(`[auth] 验证码邮件（演示，未真正发送）→ ${email}: ${code}`)
}

/** 演示环境把验证码直接返回给页面显示；设置 AUTH_DEMO=off 后关闭 */
export const DEMO_SHOW_CODE = process.env.AUTH_DEMO !== "off"
