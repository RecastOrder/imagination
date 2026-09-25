import type { ChatMode } from "@/lib/chat/modes"
import { collection } from "./db"

/**
 * 账户偏好：按邮箱保存在服务器上，所以换电脑、换浏览器登录都会沿用。
 */
export interface AccountPrefs {
  chatMode: ChatMode
}

export const DEFAULT_PREFS: AccountPrefs = { chatMode: "rigorous" }

const store = collection<AccountPrefs>("prefs")

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
