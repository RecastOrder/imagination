import { requireMyFiles } from "@/lib/server/my-files"
import { uploadIn, uploadStatusIn } from "@/lib/server/hold-files"

/** 我的文件：往自己的文件夹上传一块。?dir=&name=&uid=&offset=&total= */
export async function PUT(req: Request) {
  const g = await requireMyFiles()
  if (g.error) return g.error
  return uploadIn(req, g.user.email, g.home, g.mine)
}

/** 断点续传：这次上传 hold 已经收到多少字节 */
export async function GET(req: Request) {
  const g = await requireMyFiles()
  if (g.error) return g.error
  return uploadStatusIn(req, g.home, g.mine)
}
