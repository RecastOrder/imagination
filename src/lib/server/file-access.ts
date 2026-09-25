import type { AccessLevel } from "@/lib/access"
import { ownerOf } from "@/lib/drive/sample-tree"
import { findMember, listMembers } from "./members"
import { canEditContent, canManage, canView, getProject } from "./projects"
import { personalAccess } from "./shares"

/**
 * 某人对某个文件的权限（按文件 id 判断属于哪个空间）：
 * - 项目文件：项目成员能看；可编辑以上能改
 * - 个人文件：主人 / 管理员能改；开放给自己的按档位
 * - 平台资料库：都只能看
 */
export function fileAccess(email: string, fileId: string): AccessLevel | null {
  if (fileId.startsWith("proj/")) {
    const p = getProject(fileId.split("/")[1])
    if (!p || !canView(p, email)) return null
    return canEditContent(p, email) ? "edit" : "view"
  }
  const owner = ownerOf(fileId)
  if (owner) return findMember(owner) ? personalAccess(email, fileId, owner) : null
  if (fileId.startsWith("lib")) return "view"
  return null
}

/** 问题编号的范围 */
export function issueScope(fileId: string): string | null {
  if (fileId.startsWith("proj/")) return `proj:${fileId.split("/")[1]}`
  const owner = ownerOf(fileId)
  return owner ? `me:${owner}` : null
}

/** “@全体成员”：项目文件里，负责人 / 管理员可以一次提醒项目所有成员（已定） */
export const MENTION_ALL = "@all"
export const MENTION_ALL_NAME = "全体成员"

function projectOf(fileId: string) {
  return fileId.startsWith("proj/") ? getProject(fileId.split("/")[1]) : undefined
}

/** 可以 @ 的人：能看这个文件、账号正常的单位成员（不含自己）；负责人在项目文件里还能 @全体成员 */
export function mentionable(fileId: string, me: string) {
  const people = listMembers()
    .filter((m) => m.status === "active" && m.email !== me && fileAccess(m.email, fileId))
    .map((m) => ({ email: m.email, name: m.name }))
  const p = projectOf(fileId)
  return p && canManage(p, me) ? [{ email: MENTION_ALL, name: MENTION_ALL_NAME }, ...people] : people
}

/** 检查 @ 的人：都得能看这个文件，否则提示先给对方权限 */
export function checkMentions(
  fileId: string,
  raw: unknown,
  actor: string,
): { ok: true; mentions: string[]; everyone: boolean } | { ok: false; error: string } {
  if (raw === undefined) return { ok: true, mentions: [], everyone: false }
  if (!Array.isArray(raw) || raw.length > 20) return { ok: false, error: "提到的人太多了" }
  let mentions = [...new Set(raw.map(String))]
  const everyone = mentions.includes(MENTION_ALL)
  if (everyone) {
    const p = projectOf(fileId)
    if (!p) return { ok: false, error: "只有项目文件里可以 @全体成员" }
    if (!canManage(p, actor)) return { ok: false, error: "只有项目负责人可以 @全体成员" }
    // 展开成项目里每一位能看这个文件的成员
    mentions = [...new Set([...mentions.filter((e) => e !== MENTION_ALL), ...p.members.map((m) => m.email)])]
  }
  const blocked = mentions.find((e) => !fileAccess(e, fileId))
  if (blocked) return { ok: false, error: `${findMember(blocked)?.name ?? blocked} 看不到这个文件，先给对方权限再 @` }
  return { ok: true, mentions, everyone }
}
