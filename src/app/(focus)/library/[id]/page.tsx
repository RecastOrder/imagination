import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ReaderView } from "@/components/reader/reader-view"
import { getCurrentUser } from "@/lib/server/current-user"
import { holdGet, isHoldId } from "@/lib/server/hold-library"
import { sourcesRepo } from "@/lib/server/sources-repo"

/** 每次请求时读资料仓库（资料来自服务器上的知识库，不在构建时写死） */
export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: PageProps<"/library/[id]">): Promise<Metadata> {
  // 标题也是资料的一部分：没登录不读仓库（proxy 之外再挡一层）
  if (!(await getCurrentUser())) return { title: "资料" }
  const { id } = await params
  const s = isHoldId(id) ? await holdGet(id) : sourcesRepo().get(id)
  return { title: s?.title ?? "资料" }
}

/** 阅读模式：不在 (app) 分组里，所以没有侧栏——专注阅读。语料不对外：没登录一律当作不存在 */
export default async function ReaderPage({ params }: PageProps<"/library/[id]">) {
  if (!(await getCurrentUser())) notFound()
  const { id } = await params
  const source = isHoldId(id) ? await holdGet(id) : sourcesRepo().get(id)
  if (!source) notFound()
  return <ReaderView source={source} />
}
