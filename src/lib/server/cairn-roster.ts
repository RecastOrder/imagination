import { collection } from "./db"

/**
 * 登录名单来自 Cairn（owner 2026-09-26「登录权限按照之前的cairn的权限配置」）。
 *
 * ROSTER_SOURCE=cairn 时启用：谁能登录由 Cairn 的名单决定（Cairn 的 owner = 本平台管理员，
 * 其余 = 普通成员），名单只在 Cairn 维护一份；本平台数据库只存每个人自己的设置。
 *
 * 取名单：本机直连 Cairn GET /api/svc/roster（服务令牌），启动时一次、之后每分钟一次。
 * 每次成功都落库（带时刻）—— Cairn 暂时连不上时用上次成功的名单，不把所有人锁在门外；
 * 名单从来没拿到过时只放行 INITIAL_ADMIN_EMAIL（见 members.ts）。
 */
export interface Roster {
  owners: string[]
  members: string[]
  fetchedAt: number
}

const store = collection<Roster>("cairn_roster")
const KEY = "current"
export const ROSTER_REFRESH_MS = 60_000

export const rosterEnabled = () => process.env.ROSTER_SOURCE === "cairn"

export function currentRoster(): Roster | undefined {
  return store.get(KEY)
}

/** "owner" | "member" = 在名单上；null = 名单已知但不在上面；undefined = 从来没拿到过名单 */
export function rosterRole(email: string): "owner" | "member" | null | undefined {
  const r = currentRoster()
  if (!r) return undefined
  const e = email.trim().toLowerCase()
  if (r.owners.includes(e)) return "owner"
  if (r.members.includes(e)) return "member"
  return null
}

export async function refreshRoster(): Promise<{ ok: boolean; error?: string }> {
  const base = process.env.CAIRN_SVC_URL
  const token = process.env.CAIRN_SERVICE_TOKEN
  if (!base || !token) return { ok: false, error: "CAIRN_SVC_URL / CAIRN_SERVICE_TOKEN 未配置" }
  try {
    const res = await fetch(`${base}/api/svc/roster`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { ok: false, error: `Cairn 返回 ${res.status}` }
    const d = (await res.json()) as { owners?: unknown; members?: unknown }
    const norm = (v: unknown) =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim().toLowerCase()) : null
    const owners = norm(d.owners)
    const members = norm(d.members)
    // 形状不对不覆盖上一份好名单（一份空名单会把所有人锁在门外）
    if (!owners || !members || owners.length === 0) return { ok: false, error: "名单形状不对或没有 owner，保留上一份" }
    store.set(KEY, { owners, members, fetchedAt: Date.now() })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
