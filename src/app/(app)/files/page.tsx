import type { Metadata } from "next"

import { FilesView } from "@/components/files/files-view"

export const metadata: Metadata = { title: "我的文件" }

export default function FilesPage() {
  return <FilesView />
}
