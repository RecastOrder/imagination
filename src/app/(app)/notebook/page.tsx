import type { Metadata } from "next"

import { NotebookList } from "@/components/notebook/notebook-list"

export const metadata: Metadata = { title: "笔记本" }

export default function NotebookPage() {
  return <NotebookList />
}
