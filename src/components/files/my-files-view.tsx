"use client"

import { FolderIcon } from "lucide-react"

import { HoldBrowser } from "./hold-browser"

/**
 * 我的文件 = 服务器上属于自己的那个文件夹（owner 2026-09-26「每个成员可以管理自己的文件夹」）。
 * 上传完的文件就在列表里；点一下从右侧抽屉打开阅读，可以全屏；可以新建文件夹、改名、移动、移到回收站（不真删）。
 */
export function MyFilesView({ home }: { home: string }) {
  return (
    <HoldBrowser
      api="/api/files"
      root={home}
      rootLabel="我的文件"
      annotatable
      title={
        <>
          <FolderIcon className="size-6 text-muted-foreground" />
          我的文件
        </>
      }
      subtitle="只有你自己能改这里的文件（管理员能看，但不能改）。点文件从右侧打开阅读；把文件拖进窗口或点「上传」。"
    />
  )
}
