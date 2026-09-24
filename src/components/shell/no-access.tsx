import Link from "next/link"
import { LockIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * 无权限说明页：用户通过链接误入没有权限的页面时显示。
 * 说清楚“为什么看不到”和“找谁开通”，而不是只给一个 403。
 */
export function NoAccess({ feature, contact }: { feature: string; contact?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-sunken">
        <LockIcon className="size-5 text-muted-foreground" />
      </span>
      <h1 className="text-lg font-semibold">你没有“{feature}”的权限</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        这个功能需要管理员为你开通。{contact ? `可以联系 ${contact}。` : "请联系你所在单位的平台管理员。"}
      </p>
      <Button asChild variant="outline" size="sm" className="mt-2">
        <Link href="/chat">返回对话</Link>
      </Button>
    </div>
  )
}
