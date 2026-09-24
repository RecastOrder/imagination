import type { Metadata } from "next"

import { DesignGallery } from "@/components/design/design-gallery"

export const metadata: Metadata = { title: "设计系统" }

export default function DesignPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <p className="text-sm font-medium text-primary">设计系统 · v0.1</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">活的样张</h1>
        <p className="mt-2 mb-12 max-w-2xl text-muted-foreground">
          这一页展示的就是产品中正在使用的令牌和组件。调整令牌后，这里和整个产品会一起变化。
        </p>
        <DesignGallery />
      </div>
    </div>
  )
}
