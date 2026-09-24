import type { AccessLevel } from "@/lib/access"

/**
 * 个人文件的共享记录：谁（owner）把哪个文件 / 文件夹（itemId）共享给谁（grantee），什么档位。
 * 共享文件夹 = 里面所有文件都按同样的档位共享（包括以后新放进去的）。
 */
export interface Share {
  id: string
  owner: string
  itemId: string
  itemName: string
  folder: boolean
  grantee: string
  level: AccessLevel
  createdAt: number
}

/** itemId 是否在 share 覆盖的范围内（本身，或共享文件夹里面） */
export function covers(share: Pick<Share, "itemId">, itemId: string) {
  return itemId === share.itemId || itemId.startsWith(share.itemId + "/") || itemId.startsWith(share.itemId + "!")
}

/** 多条共享同时覆盖时取较高的档位 */
export function bestLevel(levels: AccessLevel[]): AccessLevel | null {
  if (levels.includes("edit")) return "edit"
  return levels.length ? "view" : null
}
