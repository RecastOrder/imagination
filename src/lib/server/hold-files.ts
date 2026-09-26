import { NextResponse } from "next/server"

import { holdFsEdit, holdFsList, holdFsUploadChunk, holdFsUploadStatus, holdStream } from "./hold-library"

/**
 * hold 上的文件，两个入口共用这一层（owner 2026-09-26「"我的文件" 与管理员看到的tank我觉得要分开」）：
 * - 「我的文件」：每个成员自己的文件夹 /tank/people/<邮箱>，本人可以上传、新建、改名、移动、移到回收站；
 * - 「存储总库」：管理员看整个 /tank，只有 inbox 与 baidu 能改，其余只读（成员的文件对管理员也只读）。
 * 「谁能改哪里」这一侧只决定**给哪个范围**（scope），hold 那一侧按真实路径再判一次「要改的东西在不在这个范围里」。
 */
/** 测试实例可以换根（HOLD_PEOPLE_ROOT）；生产不设 = /tank/people */
export const PEOPLE_ROOT = process.env.HOLD_PEOPLE_ROOT || "/tank/people"
/** 管理员在存储总库里拿到的范围：inbox + baidu（hold 端的 SHARED_SCOPE） */
export const SHARED_SCOPE = "shared"
export const SHARED_ROOTS = ["/tank/inbox", "/tank/baidu"]

/** 成员自己的文件夹：邮箱就是名字（小写；只许常见字符，否则不给文件夹） */
export function homeOf(email: string): string | null {
  const e = email.trim().toLowerCase()
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+$/.test(e) && !e.startsWith(".") ? `${PEOPLE_ROOT}/${e}` : null
}

/** p 是不是 root 或它里面的路径（不许 ..、不许 NUL） */
export function within(root: string, p: string | null): p is string {
  if (!p || p.includes("\0") || p.split("/").includes("..")) return false
  return p === root || p.startsWith(root + "/")
}

export async function listIn(path: string, offset: number, scope: string | undefined, emptyIfMissing: boolean) {
  const r = await holdFsList(path, offset, scope)
  if ("error" in r) {
    // 成员第一次来：自己的文件夹还没有（第一次上传或新建时 hold 会建出来）⇒ 显示空的、可以改
    if (emptyIfMissing && r.status === 404) return NextResponse.json({ path, total: 0, entries: [], editable: true, trash: false, editRoot: path })
    return NextResponse.json({ error: r.error }, { status: r.status })
  }
  return NextResponse.json(r, { headers: { "cache-control": "private, no-store" } })
}

/**
 * 把 hold 上的一个文件转给浏览器。hold 上很多东西是外站抓来的：SVG / HTML 里可能带脚本，在本站打开 =
 * 以登录的人的身份在 recastorder.com 上执行 ⇒ 只有 PDF / 位图 / 纯文本 / 音视频允许在浏览器里打开，其余一律当下载；并加沙箱。
 */
export async function serveHoldFile(path: string, download: boolean): Promise<Response> {
  const name = path.split("/").pop() || "file"
  const r = await holdStream(`/v1/fs/file?${new URLSearchParams({ path })}`)
  if (!r.ok) return r
  const headers = new Headers(r.headers)
  const type = headers.get("content-type") ?? ""
  const inlineOk = /^(application\/pdf|image\/(jpeg|png|gif|webp)|text\/plain|audio\/|video\/)/.test(type)
  const inline = !download && inlineOk
  if (!inlineOk) headers.set("content-type", "application/octet-stream")
  headers.set("content-security-policy", "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'")
  headers.set("x-content-type-options", "nosniff")
  headers.set("cache-control", "private, no-store")
  headers.set("content-disposition", `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(name)}`)
  return new Response(r.body, { status: 200, headers })
}

const OPS = new Set(["mkdir", "rename", "move", "trash", "restore"])
const PATH_KEYS = ["path", "dir", "dest"] as const

/** 改：只把 path / dir / dest 三个路径与 name 转给 hold；每个路径都必须在 allowed 里（本机这一侧的第一道） */
export async function editIn(op: string, req: Request, actor: string, scope: string, allowed: (p: string) => boolean) {
  if (!OPS.has(op)) return NextResponse.json({ error: "没有这个操作" }, { status: 404 })
  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!raw || typeof raw !== "object") return NextResponse.json({ error: "请求体要是 JSON" }, { status: 400 })
  const body: Record<string, unknown> = {}
  for (const k of PATH_KEYS) {
    if (raw[k] === undefined) continue
    const p = typeof raw[k] === "string" ? (raw[k] as string) : ""
    if (!allowed(p)) return NextResponse.json({ error: "这里不能改" }, { status: 403 })
    body[k] = p
  }
  if (typeof raw.name === "string") body.name = raw.name
  const r = await holdFsEdit(op, body, actor, scope)
  return NextResponse.json(r.body, { status: r.status })
}

/** 一块最大 32 MB：线上前面有 Cloudflare（单个请求体有上限），大文件拆成多块依次传，断了从已收到的位置接着传 */
const CHUNK_MAX = 32 << 20
const UID = /^[0-9a-f]{16,32}$/

function uploadQuery(req: Request) {
  const q = new URL(req.url).searchParams
  const num = (k: string) => (/^\d+$/.test(q.get(k) ?? "") ? Number(q.get(k)) : NaN)
  return { dir: q.get("dir"), name: q.get("name") ?? "", uid: q.get("uid") ?? "", offset: num("offset"), total: num("total") }
}

export async function uploadIn(req: Request, actor: string, scope: string, allowed: (p: string) => boolean) {
  const q = uploadQuery(req)
  const cl = req.headers.get("content-length")
  if (cl === null || !/^\d+$/.test(cl)) return NextResponse.json({ error: "要带 content-length" }, { status: 411 })
  const length = Number(cl)
  if (!q.dir || !allowed(q.dir)) return NextResponse.json({ error: "这里不能上传" }, { status: 403 })
  if (!UID.test(q.uid) || !Number.isFinite(q.offset) || !Number.isFinite(q.total)) return NextResponse.json({ error: "上传参数不对" }, { status: 400 })
  if (!Number.isFinite(length) || length < 0 || length > CHUNK_MAX) return NextResponse.json({ error: "每一块最多 32 MB" }, { status: 413 })
  const body = req.body ?? new ReadableStream<Uint8Array>({ start: (c) => c.close() })
  const r = await holdFsUploadChunk({ dir: q.dir, name: q.name, uid: q.uid, offset: q.offset, total: q.total }, body, length, actor, scope)
  return NextResponse.json(r.body, { status: r.status })
}

export async function uploadStatusIn(req: Request, scope: string, allowed: (p: string) => boolean) {
  const q = uploadQuery(req)
  if (!q.dir || !allowed(q.dir) || !UID.test(q.uid)) return NextResponse.json({ error: "参数不对" }, { status: 400 })
  const r = await holdFsUploadStatus(q.dir, q.uid, scope)
  return NextResponse.json(r.body, { status: r.status })
}
