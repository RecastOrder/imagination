import type { ChatMode } from "@/lib/chat/modes"
import { collection } from "./db"

/**
 * 账户偏好：按邮箱保存在服务器上，所以换电脑、换浏览器登录都会沿用。
 */
export interface AccountPrefs {
  chatMode: ChatMode
  /**
   * 管理员对比视角（owner 2026-09-26「给我提供一个按钮用来切换对比看管理员和用户的界面差异」）：
   * 打开后，这个管理员在所有服务端判定里都按普通成员算（页面、文件可见范围、管理入口）。
   * 只能往下切；只有真正的管理员能打开（接口里校验）。
   */
  viewAsMember: boolean
}

export const DEFAULT_PREFS: AccountPrefs = { chatMode: "rigorous", viewAsMember: false }

const store = collection<AccountPrefs>("prefs")

export function getPrefs(email: string): AccountPrefs {
  return { ...DEFAULT_PREFS, ...store.get(email) }
}

export function updatePrefs(
  email: string,
  patch: Partial<AccountPrefs>,
  opts: { realAdmin?: boolean } = {},
): AccountPrefs {
  const clean: Partial<AccountPrefs> = {}
  if (patch.chatMode === "rigorous" || patch.chatMode === "divergent") clean.chatMode = patch.chatMode
  // 对比视角只有真正的管理员能打开；关掉谁都可以（关掉只会让自己回到本来的权限）
  if (patch.viewAsMember === false) clean.viewAsMember = false
  if (patch.viewAsMember === true && opts.realAdmin) clean.viewAsMember = true
  const next = { ...getPrefs(email), ...clean }
  store.set(email, next)
  return next
}
