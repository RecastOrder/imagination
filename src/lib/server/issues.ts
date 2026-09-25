import type { Mark } from "@/lib/drive/annotations"
import type { Issue, IssueReply } from "@/lib/drive/issues"
import { collection } from "./db"
import { findMember } from "./members"

/** 问题（服务端）。权限由接口先用 fileAccess() 判断 */
const store = collection<Issue>("issues")

const nameOf = (email: string) => findMember(email)?.name ?? email.split("@")[0]
const newId = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function listIssuesForFile(fileId: string) {
  return store
    .values()
    .filter((i) => i.fileId === fileId)
    .sort((a, b) => a.number - b.number)
}

export function listIssuesInScope(scope: string) {
  return store
    .values()
    .filter((i) => i.scope === scope)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function getIssue(id: string) {
  return store.get(id)
}

const finite = (...n: unknown[]) => n.every((x) => typeof x === "number" && Number.isFinite(x))

/** 只接受形状正确的标注（防止写进奇怪的数据） */
function cleanMark(m: unknown): Mark | null {
  const x = m as Mark
  if (!x || typeof x !== "object" || !finite(x.page) || x.page < 1) return null
  const text = typeof x.text === "string" ? x.text.slice(0, 2000) : ""
  const id = newId("m")
  if (x.kind === "pin" && finite(x.x, x.y)) return { id, kind: "pin", page: x.page, x: x.x, y: x.y, text }
  if (x.kind === "rect" && finite(x.x, x.y, x.w, x.h)) return { id, kind: "rect", page: x.page, x: x.x, y: x.y, w: x.w, h: x.h, text }
  if (x.kind === "measure" && finite(x.x1, x.y1, x.x2, x.y2))
    return { id, kind: "measure", page: x.page, x1: x.x1, y1: x.y1, x2: x.x2, y2: x.y2, text }
  return null
}

export function raiseIssue(input: {
  scope: string
  fileId: string
  fileName: unknown
  mark: unknown
  scale?: unknown
  title: unknown
  author: string
}): { ok: true; issue: Issue } | { ok: false; error: string } {
  const title = typeof input.title === "string" ? input.title.trim().slice(0, 200) : ""
  if (!title) return { ok: false, error: "请写一句问题说明" }
  const mark = cleanMark(input.mark)
  if (!mark) return { ok: false, error: "标注数据不正确" }
  const number = listIssuesInScope(input.scope).reduce((n, i) => Math.max(n, i.number), 0) + 1
  const issue: Issue = {
    id: newId("is"),
    scope: input.scope,
    number,
    fileId: input.fileId,
    fileName: typeof input.fileName === "string" ? input.fileName.slice(0, 200) : input.fileId,
    mark,
    scale: finite(input.scale) && (input.scale as number) > 0 ? (input.scale as number) : undefined,
    title,
    status: "open",
    author: input.author,
    authorName: nameOf(input.author),
    createdAt: Date.now(),
    replies: [],
  }
  store.set(issue.id, issue)
  return { ok: true, issue }
}

export function replyIssue(id: string, author: string, text: unknown): { ok: true; issue: Issue } | { ok: false; error: string } {
  const i = store.get(id)
  if (!i) return { ok: false, error: "问题不存在" }
  const t = typeof text === "string" ? text.trim().slice(0, 2000) : ""
  if (!t) return { ok: false, error: "回复不能为空" }
  const reply: IssueReply = { id: newId("r"), author, authorName: nameOf(author), text: t, at: Date.now() }
  const next = { ...i, replies: [...i.replies, reply] }
  store.set(id, next)
  return { ok: true, issue: next }
}

export function setIssueStatus(id: string, status: unknown, by: string): { ok: true; issue: Issue } | { ok: false; error: string } {
  const i = store.get(id)
  if (!i) return { ok: false, error: "问题不存在" }
  if (status !== "open" && status !== "closed") return { ok: false, error: "状态不正确" }
  const next: Issue = status === "closed" ? { ...i, status, closedBy: by, closedAt: Date.now() } : { ...i, status, closedBy: undefined, closedAt: undefined }
  store.set(id, next)
  return { ok: true, issue: next }
}
