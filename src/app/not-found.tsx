import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold">页面不存在</h1>
      <Button asChild variant="outline" className="mt-2">
        <Link href="/">回到首页</Link>
      </Button>
    </div>
  )
}
