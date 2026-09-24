import type { Metadata } from "next"

import { NotebookView } from "@/components/notebook/notebook-view"

export const metadata: Metadata = { title: "笔记本" }

export default async function NotebookDetailPage({ params }: PageProps<"/notebook/[id]">) {
  const { id } = await params
  return <NotebookView id={id} />
}
