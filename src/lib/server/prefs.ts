import type { ChatMode } from "@/lib/chat/modes"

/**
 * 账户偏好：按邮箱保存在服务器上，所以换电脑、换浏览器登录都会沿用。
 * 演示版存在内存里（服务重启会丢）；上线时换成数据库的一张表。
 */
export interface AccountPrefs {
  chatMode: ChatMode
}

export const DEFAULT_PREFS: AccountPrefs = { chatMode: "rigorous" }

const g = globalThis as unknown as { __prefs?: Map<string, AccountPrefs> }
const store = (g.__prefs ??= new Map())

export function getPrefs(email: string): AccountPrefs {
  return { ...DEFAULT_PREFS, ...store.get(email) }
}

export function updatePrefs(email: string, patch: Partial<AccountPrefs>): AccountPrefs {
  const clean: Partial<AccountPrefs> = {}
  if (patch.chatMode === "rigorous" || patch.chatMode === "divergent") clean.chatMode = patch.chatMode
  const next = { ...getPrefs(email), ...clean }
  store.set(email, next)
  return next
}
