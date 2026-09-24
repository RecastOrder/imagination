import type { Metadata } from "next"

import { NoAccess } from "@/components/shell/no-access"
import { requireFeature } from "@/lib/server/guard"
import { NotebookView } from "@/components/notebook/notebook-view"

export const metadata: Metadata = { title: "笔记本" }

export default async function NotebookDetailPage({ params }: PageProps<"/notebook/[id]">) {
  if (!(await requireFeature("notebook"))) return <NoAccess feature="笔记本" />
  const { id } = await params
  return <NotebookView id={id} />
}
