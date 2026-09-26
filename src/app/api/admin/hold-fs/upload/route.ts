import { requireHoldAdmin, tankPath } from "@/lib/server/admin-hold"
import { SHARED_ROOTS, SHARED_SCOPE, uploadIn, uploadStatusIn, within } from "@/lib/server/hold-files"

/** 本机这一侧：只能传进 inbox / baidu（hold 端按真实路径再判一次） */
const ok = (p: string) => !!tankPath(p) && SHARED_ROOTS.some((r) => within(r, p))

/** 存储总库：往 inbox / baidu 上传一块。?dir=&name=&uid=&offset=&total= */
export async function PUT(req: Request) {
  const g = await requireHoldAdmin()
  if (g.error) return g.error
  return uploadIn(req, g.user.email, SHARED_SCOPE, ok)
}

/** 断点续传：这次上传 hold 已经收到多少字节 */
export async function GET(req: Request) {
  const g = await requireHoldAdmin()
  if (g.error) return g.error
  return uploadStatusIn(req, SHARED_SCOPE, ok)
}
