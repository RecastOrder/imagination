import { SOURCE_KINDS, SOURCE_KIND_ORDER } from "@/lib/sources/kinds"
import { SOURCES } from "@/lib/sources/mock"
import type { DriveNode } from "./types"

const t = (d: number) => Date.UTC(2026, 8, d)
const f = (id: string, name: string, file: string, size: number, day: number, archive = false): DriveNode => ({
  type: "file",
  id,
  name,
  url: `/samples/drive/${file}`,
  size,
  updatedAt: t(day),
  archive,
})

/** 演示：一个项目文件夹（沿用建议的固定顶层结构）。真实环境来自 个人云盘 / NAS / OneDrive */
export const PROJECT_TREE: DriveNode = {
  type: "folder",
  id: "p",
  name: "某住宅项目",
  hint: "项目文件",
  children: [
    { type: "folder", id: "p/00", name: "00 收件箱", children: [f("p/00/note", "待整理-截图说明.txt", "inbox-note.txt", 64, 20)] },
    {
      type: "folder",
      id: "p/01",
      name: "01 资料依据",
      children: [
        f("p/01/brief", "设计任务书.md", "brief.md", 576, 10),
        f("p/01/report", "日照分析报告.pdf", "sunlight-report.pdf", 4922, 16),
        f("p/01/units", "户型面积表.csv", "units.csv", 102, 12),
      ],
    },
    {
      type: "folder",
      id: "p/02",
      name: "02 设计过程",
      children: [
        f("p/02/3dm", "体块推敲-v2.3dm", "massing-v2.3dm", 22646, 19),
        f("p/02/stl", "塔楼体块.stl", "tower.stl", 2427, 17),
        f("p/02/sketch", "总图草图.png", "site-sketch.png", 12517, 15),
        f("p/02/photo", "现场照片.jpg", "site-photo.jpg", 109547, 8),
      ],
    },
    {
      type: "folder",
      id: "p/03",
      name: "03 成果",
      children: [
        f("p/03/dwg", "总平面图-施工图.dwg", "site-plan.dwg", 4102, 21),
        f("p/03/docx", "设计说明.docx", "design-notes.docx", 1260, 21),
      ],
    },
    {
      type: "folder",
      id: "p/04",
      name: "04 往来",
      children: [
        f("p/04/zip", "甲方提供资料.zip", "client-files.zip", 56888, 18, true),
        f("p/04/minutes", "会议纪要-0918.txt", "minutes-0918.txt", 236, 18),
      ],
    },
    { type: "folder", id: "p/99", name: "99 归档", children: [] },
  ],
}

/** 平台资料库：按资料类型分文件夹 */
export const LIBRARY_TREE: DriveNode = {
  type: "folder",
  id: "lib",
  name: "资料库",
  hint: "平台提供",
  children: SOURCE_KIND_ORDER.map((k) => ({
    type: "folder" as const,
    id: `lib/${k}`,
    name: SOURCE_KINDS[k].label,
    children: SOURCES.filter((s) => s.kind === k).map((s) => ({
      type: "source" as const,
      id: `lib/${k}/${s.id}`,
      name: s.code ? `${s.code} ${s.title}` : s.title,
      sourceId: s.id,
    })),
  })).filter((folder) => folder.children.length > 0),
}

export const DRIVE_ROOTS: DriveNode[] = [PROJECT_TREE, LIBRARY_TREE]
