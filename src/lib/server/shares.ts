import type { AccessLevel } from "@/lib/access"
import { findNode, myTree } from "@/lib/drive/sample-tree"
import { bestLevel, covers, type Share } from "@/lib/drive/shares"
import { findMember, isAdmin } from "./members"

/**
 * 个人文件共享（服务端）。演示版存内存，上线换数据库。
 * 规则：
 * - 只有文件主人能共享、改档位、取消；管理员也可以取消（例如人员离职时收回）
 * - 只能共享给单位成员名单里、未停用的人
 * - 同一个人对同一项只有一条记录，再次共享 = 改档位
 */
const g = globalThis as unknown as { __shares?: Map<string, Share> }
const SEED: Share[] = [
  {
    id: "sh1",
    owner: "li.na@studio.cn",
    itemId: "me/li.na@studio.cn/ref",
    itemName: "参考图片",
    folder: true,
    grantee: "zhang.ming@studio.cn",
    level: "view",
    createdAt: Date.UTC(2026, 8, 20),
  },
  {
    id: "sh2",
    owner: "zhang.ming@studio.cn",
    itemId: "me/zhang.ming@studio.cn/notes",
    itemName: "我的笔记.md",
    folder: false,
    grantee: "li.na@studio.cn",
    level: "edit",
    createdAt: Date.UTC(2026, 8, 21),
  },
]
const store = (g.__shares ??= new Map(SEED.map((s) => [s.id, { ...s }])))

export function listSharesBy(owner: string): Share[] {
  return [...store.values()].filter((s) => s.owner === owner)
}

export function listSharedWith(email: string): Share[] {
  return [...store.values()].filter((s) => s.grantee === email && findMember(s.owner)?.status !== "disabled")
}

/** 某人对一个个人文件的权限：主人 = 编辑；否则看共享记录；都没有 = null */
export function personalAccess(email: string, itemId: string, owner: string): AccessLevel | null {
  if (email === owner) return "edit"
  return bestLevel(listSharedWith(email).filter((s) => covers(s, itemId)).map((s) => s.level))
}

type Result = { ok: true; share: Share } | { ok: false; error: string; status: number }

export function grantShare(input: { owner: string; itemId: string; grantee: string; level: AccessLevel }): Result {
  if (input.level !== "view" && input.level !== "edit") return { ok: false, error: "档位不正确", status: 400 }
  const node = findNode(myTree(input.owner), input.itemId)
  if (!node || node.id === `me/${input.owner}`) {
    return { ok: false, error: node ? "请选择具体的文件或文件夹共享" : "只能共享你自己的文件", status: 403 }
  }
  if (input.grantee === input.owner) return { ok: false, error: "不需要共享给自己", status: 400 }
  const m = findMember(input.grantee)
  if (!m || m.status === "disabled") return { ok: false, error: "对方不在单位成员名单里，或账号已停用", status: 400 }
  const existing = [...store.values()].find((s) => s.itemId === input.itemId && s.grantee === input.grantee)
  const share: Share = existing
    ? { ...existing, level: input.level }
    : {
        id: `sh${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        owner: input.owner,
        itemId: input.itemId,
        itemName: node.name,
        folder: node.type === "folder",
        grantee: input.grantee,
        level: input.level,
        createdAt: Date.now(),
      }
  store.set(share.id, share)
  return { ok: true, share }
}

function ownedOrAdmin(id: string, actor: string): Share | { error: string; status: number } {
  const s = store.get(id)
  if (!s) return { error: "共享记录不存在", status: 404 }
  if (s.owner !== actor && !isAdmin(actor)) return { error: "只有文件主人可以修改共享", status: 403 }
  return s
}

export function setShareLevel(id: string, level: AccessLevel, actor: string): Result {
  const s = ownedOrAdmin(id, actor)
  if ("error" in s) return { ok: false, ...s }
  if (level !== "view" && level !== "edit") return { ok: false, error: "档位不正确", status: 400 }
  const next = { ...s, level }
  store.set(id, next)
  return { ok: true, share: next }
}

export function revokeShare(id: string, actor: string): Result {
  const s = ownedOrAdmin(id, actor)
  if ("error" in s) return { ok: false, ...s }
  store.delete(id)
  return { ok: true, share: s }
}
