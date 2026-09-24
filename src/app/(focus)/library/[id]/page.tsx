import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ReaderView } from "@/components/reader/reader-view"
import { getSource, SOURCES } from "@/lib/sources/mock"

export function generateStaticParams() {
  return SOURCES.map((s) => ({ id: s.id }))
}

export async function generateMetadata({ params }: PageProps<"/library/[id]">): Promise<Metadata> {
  const { id } = await params
  return { title: getSource(id)?.title ?? "资料" }
}

/** 阅读模式：不在 (app) 分组里，所以没有侧栏——专注阅读 */
export default async function ReaderPage({ params }: PageProps<"/library/[id]">) {
  const { id } = await params
  const source = getSource(id)
  if (!source) notFound()
  return <ReaderView source={source} />
}
