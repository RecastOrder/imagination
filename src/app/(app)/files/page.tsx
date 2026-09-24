import type { Metadata } from "next"

import { NoAccess } from "@/components/shell/no-access"
import { requireFeature } from "@/lib/server/guard"
import { FilesView } from "@/components/files/files-view"

export const metadata: Metadata = { title: "我的文件" }

export default async function FilesPage() {
  if (!(await requireFeature("upload"))) return <NoAccess feature="上传与云盘" />
  return <FilesView />
}
