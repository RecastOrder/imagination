import { editIn } from "@/lib/server/hold-files"
import { requireMyFiles } from "@/lib/server/my-files"

/** 我的文件：在自己的文件夹里新建文件夹 · 改名 · 移动 · 移到回收站 · 放回（owner 2026-09-26「每个成员可以管理自己的文件夹」） */
export async function POST(req: Request, { params }: RouteContext<"/api/files/edit/[op]">) {
  const g = await requireMyFiles()
  if (g.error) return g.error
  const { op } = await params
  return editIn(op, req, g.user.email, g.home, g.mine)
}
