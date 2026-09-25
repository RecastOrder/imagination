/**
 * 查看记录（审计日志）：管理员打开别人的“我的”文件时记一笔，只有管理员能看。
 * 管理员有全部权限；留记录是为了出问题时可以追查，平时不打扰任何人。
 * 保留期限（已定）：永久保留，不提供删除——和文件历史版本的规则一致。
 * 演示版存内存；上线后写进数据库，并且在服务器发文件（下载地址）的那一步记录，才算完整。
 */
export interface AdminViewEntry {
  id: string
  at: number
  admin: string
  owner: string
  itemId: string
  itemName: string
}

const g = globalThis as unknown as { __adminViews?: AdminViewEntry[] }
const log = (g.__adminViews ??= [])

/** 同一位管理员 10 分钟内反复打开同一个文件，只记一次 */
const DEDUPE_MS = 10 * 60 * 1000

export function logAdminView(e: Omit<AdminViewEntry, "id" | "at">): AdminViewEntry | null {
  const now = Date.now()
  const recent = log.find((x) => x.admin === e.admin && x.itemId === e.itemId && now - x.at < DEDUPE_MS)
  if (recent) return null
  const entry = { ...e, id: `av${now.toString(36)}${log.length.toString(36)}`, at: now }
  log.unshift(entry)
  return entry
}

export function listAdminViews(): AdminViewEntry[] {
  return [...log]
}
