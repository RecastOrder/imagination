import { requireHoldAdmin, tankPath } from "@/lib/server/admin-hold"
import { SHARED_ROOTS, SHARED_SCOPE, editIn, within } from "@/lib/server/hold-files"

/**
 * 存储总库里改东西：新建文件夹 · 改名 · 移动 · 移到回收站 · 放回。
 * 只有 inbox / baidu 能改（owner 2026-09-26「整理好的资料，系统与备份，成员文件 对于管理员为只读。 inbox baidu为可以编辑的文件区域。」）
 * —— 这一侧给的范围是 inbox + baidu，hold 端按真实路径判，其余一律 403；每笔 hold 记进 /tank/_manifests/fs-edits.jsonl。
 */
export async function POST(req: Request, { params }: RouteContext<"/api/admin/hold-fs/edit/[op]">) {
  const g = await requireHoldAdmin()
  if (g.error) return g.error
  const { op } = await params
  // 本机这一侧：路径必须在 inbox / baidu 里（可以是这两个根本身 —— 往根里新建、上传、移到根）；hold 端再按真实路径判一次
  return editIn(op, req, g.user.email, SHARED_SCOPE, (p) => !!tankPath(p) && SHARED_ROOTS.some((r) => within(r, p)))
}
