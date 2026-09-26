import type { Metadata } from "next"

import { NoAccess } from "@/components/shell/no-access"
import { requireFeature } from "@/lib/server/guard"
import { GhGenerator } from "@/components/projects/gh-generator"

export const metadata: Metadata = { title: "GH 生成器" }

/** 插件 › GH 生成器：不挂在某个项目下，个人随手用；生成记录和项目 › 分析工具里的是同一份 */
export default async function GhPluginPage() {
  if (!(await requireFeature("tool_gh"))) return <NoAccess feature="GH 生成器" />
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">GH 生成器</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          用中文描述想要的 Grasshopper 电池组，拿回 .gh、.3dm 和两张图。这里的生成记录和各项目「分析工具」里的是同一份。
        </p>
        <GhGenerator />
      </div>
    </div>
  )
}
