import type { Metadata } from "next"

import { NoAccess } from "@/components/shell/no-access"
import { requireFeature } from "@/lib/server/guard"
import { NotebookList } from "@/components/notebook/notebook-list"

export const metadata: Metadata = { title: "笔记本" }

export default async function NotebookPage() {
  if (!(await requireFeature("notebook"))) return <NoAccess feature="笔记本" />
  return <NotebookList />
}
