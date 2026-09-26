"use client"

import { DatabaseIcon } from "lucide-react"

import { HoldBrowser, type BrowserGroup } from "./hold-browser"

/**
 * 存储总库 = hold 上的全部文件（owner 2026-09-26「在管理员的我的文件里面，可以看到所有的文件夹」，同日拆成独立一页）。
 * 可以改的只有 inbox 与 baidu（owner 同日「整理好的资料，系统与备份，成员文件 对于管理员为只读。 inbox baidu为可以编辑的文件区域。」）；
 * 这一页只负责分组显示，能不能改由服务端逐个文件夹回答（列目录时的 editable）。
 */
const GROUPS: BrowserGroup[] = [
  { title: "整理好的资料 · 只读", hint: "规范 · 图集 · 杂志 · 媒体与语料 · 识别产物", names: ["library", "architecture-magazines", "corpus", "cairn-archive", "derived"] },
  { title: "我的下载 · 可以修改", hint: "下载到服务器上的文件（百度网盘等）：可以上传、新建文件夹、改名、移动、移到回收站", names: ["inbox", "baidu"] },
  { title: "成员的文件 · 只读", hint: "每人一个文件夹（成员在自己的「我的文件」里管理）", names: ["people"] },
]

export function StorageView() {
  return (
    <HoldBrowser
      api="/api/admin/hold-fs"
      root="/tank"
      rootLabel="tank"
      groups={GROUPS}
      annotatable
      title={
        <>
          <DatabaseIcon className="size-6 text-muted-foreground" />
          存储总库
        </>
      }
      subtitle="服务器（hold）上的全部文件。只有「我的下载」里的 inbox 和 baidu 能改；删掉的东西进回收站，不会真删；每次打开文件都会记入查看记录。"
    />
  )
}
