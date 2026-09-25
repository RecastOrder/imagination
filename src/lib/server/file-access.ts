import type { AccessLevel } from "@/lib/access"
import { ownerOf } from "@/lib/drive/sample-tree"
import { findMember, listMembers } from "./members"
import { canEditContent, canView, getProject } from "./projects"
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

/** 可以 @ 的人：能看这个文件、账号正常的单位成员（不含自己） */
export function mentionable(fileId: string, me: string) {
  return listMembers()
    .filter((m) => m.status === "active" && m.email !== me && fileAccess(m.email, fileId))
    .map((m) => ({ email: m.email, name: m.name }))
}

/** 检查 @ 的人：都得能看这个文件，否则提示先给对方权限 */
export function checkMentions(fileId: string, raw: unknown): { ok: true; mentions: string[] } | { ok: false; error: string } {
  if (raw === undefined) return { ok: true, mentions: [] }
  if (!Array.isArray(raw) || raw.length > 20) return { ok: false, error: "提到的人太多了" }
  const mentions = [...new Set(raw.map(String))]
  const blocked = mentions.find((e) => !fileAccess(e, fileId))
  if (blocked) return { ok: false, error: `${findMember(blocked)?.name ?? blocked} 看不到这个文件，先给对方权限再 @` }
  return { ok: true, mentions }
}
