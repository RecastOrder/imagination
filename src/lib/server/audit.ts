/**
 * 查看记录（审计日志）：管理员打开别人的“我的”文件时记一笔，只有管理员能看。
 * 管理员有全部权限；留记录是为了出问题时可以追查，平时不打扰任何人。
 * 保留期限（已定）：永久保留，不提供删除——和文件历史版本的规则一致。
 * 存在数据库里（只增不改）。完整做法还要在服务器发文件（下载地址）的那一步记录——等接上真实文件存储时补上。
 */
import { collection } from "./db"

export interface AdminViewEntry {
  id: string
  at: number
  admin: string
  owner: string
  itemId: string
  itemName: string
}

const store = collection<AdminViewEntry>("admin_views")
const log = () => store.values().sort((a, b) => b.at - a.at)

/** 同一位管理员 10 分钟内反复打开同一个文件，只记一次 */
const DEDUPE_MS = 10 * 60 * 1000

export function logAdminView(e: Omit<AdminViewEntry, "id" | "at">): AdminViewEntry | null {
  const now = Date.now()
  const recent = log().find((x) => x.admin === e.admin && x.itemId === e.itemId && now - x.at < DEDUPE_MS)
  if (recent) return null
  const entry = { ...e, id: `av${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, at: now }
  store.set(entry.id, entry)
  return entry
}

export function listAdminViews(): AdminViewEntry[] {
  return log()
}
