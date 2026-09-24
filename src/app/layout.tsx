import type { Metadata, Viewport } from "next"

import { themeInitScript } from "@/components/shell/theme-toggle"
import { Toaster } from "@/components/ui/toast"
import "./globals.css"

export const metadata: Metadata = {
  title: { default: "Imagination", template: "%s · Imagination" },
  description: "以知识库为基础的建筑设计工作台",
}

/** 浏览器地址栏颜色：这里无法读取 CSS 变量，只能写值，需与 --stone-50 / --stone-950 保持一致 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#141311" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
