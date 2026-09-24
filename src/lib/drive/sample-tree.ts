import { SOURCE_KINDS, SOURCE_KIND_ORDER } from "@/lib/sources/kinds"
import { SOURCES } from "@/lib/sources/mock"
import { PROJECTS } from "./projects"
import type { DriveNode } from "./types"

/**
 * 文件浏览的三个空间（已定）：
 * - 公共：平台资料库（规范、图集、书籍…），按账号的资料范围权限显示
 * - 项目：只显示自己参与的项目；项目成员共享
 * - 我的：只有自己能看到
 * 演示阶段文件来自 public/samples/drive；上线后来自对象存储 / NAS / OneDrive。
 */
export type Space = "public" | "project" | "mine"

export const SPACES: { value: Space; label: string }[] = [
  { value: "public", label: "公共" },
  { value: "project", label: "项目" },
  { value: "mine", label: "我的" },
]

export function spaceOf(id: string | null | undefined): Space | null {
  if (!id) return null
  if (id.startsWith("lib")) return "public"
  if (id.startsWith("proj/")) return "project"
  if (id.startsWith("me")) return "mine"
  return null
}

const t = (d: number) => Date.UTC(2026, 8, d)
const file = (id: string, name: string, sample: string, size: number, day: number, archive = false): DriveNode => ({
  type: "file",
  id,
  name,
  url: `/samples/drive/${sample}`,
  size,
  updatedAt: t(day),
  archive,
})
const folder = (id: string, name: string, children: DriveNode[], hint?: string): DriveNode => ({ type: "folder", id, name, children, hint })

const H = "proj/housing"
const housing = folder(
  H,
  "某住宅项目",
  [
    folder(`${H}/00`, "00 收件箱", [file(`${H}/00/note`, "待整理-截图说明.txt", "inbox-note.txt", 64, 20)]),
    folder(`${H}/01`, "01 资料依据", [
      file(`${H}/01/brief`, "设计任务书.md", "brief.md", 576, 10),
      file(`${H}/01/report`, "日照分析报告.pdf", "sunlight-report.pdf", 4922, 16),
      file(`${H}/01/units`, "户型面积表.csv", "units.csv", 102, 12),
    ]),
    folder(`${H}/02`, "02 设计过程", [
      file(`${H}/02/plan`, "户型平面草图.png", "unit-plan.png", 33769, 22),
      file(`${H}/02/3dm`, "体块推敲-v2.3dm", "massing-v2.3dm", 22646, 19),
      file(`${H}/02/stl`, "塔楼体块.stl", "tower.stl", 2427, 17),
      file(`${H}/02/sketch`, "总图草图.png", "site-sketch.png", 12517, 15),
      file(`${H}/02/photo`, "现场照片.jpg", "site-photo.jpg", 109547, 8),
    ]),
    folder(`${H}/03`, "03 成果", [
      file(`${H}/03/docx`, "设计说明.docx", "design-notes.docx", 37360, 21),
      file(`${H}/03/xlsx`, "户型配比与指标.xlsx", "unit-mix.xlsx", 5859, 21),
      file(`${H}/03/pptx`, "方案汇报.pptx", "scheme-review.pptx", 30474, 22),
      file(`${H}/03/dwg`, "总平面图-施工图.dwg", "site-plan.dwg", 4102, 21),
    ]),
    folder(`${H}/04`, "04 往来", [
      file(`${H}/04/zip`, "甲方提供资料.zip", "client-files.zip", 56888, 18, true),
      file(`${H}/04/minutes`, "会议纪要-0918.txt", "minutes-0918.txt", 236, 18),
    ]),
    folder(`${H}/99`, "99 归档", []),
  ],
  "上海 · 住宅 · 方案",
)

const S = "proj/school"
const school = folder(
  S,
  "某学校项目",
  [
    folder(`${S}/00`, "00 收件箱", []),
    folder(`${S}/01`, "01 资料依据", [file(`${S}/01/brief`, "任务书.md", "school-brief.md", 125, 5)]),
    folder(`${S}/02`, "02 设计过程", []),
    folder(`${S}/03`, "03 成果", []),
    folder(`${S}/04`, "04 往来", []),
    folder(`${S}/99`, "99 归档", []),
  ],
  "杭州 · 学校 · 初设",
)

export const PROJECT_TREES: Record<string, DriveNode> = { housing, school }

/** 我的：个人文件（演示中每个人看到同一份示例） */
export const MY_TREE: DriveNode = folder(
  "me",
  "我的文件",
  [
    file("me/notes", "我的笔记.md", "my-notes.md", 209, 23),
    folder("me/ref", "参考图片", [file("me/ref/photo", "街道界面参考.jpg", "site-photo.jpg", 109547, 9)]),
  ],
  "仅自己可见",
)

/** 公共：平台资料库，按资料类型分文件夹 */
export const LIBRARY_TREE: DriveNode = folder(
  "lib",
  "资料库",
  SOURCE_KIND_ORDER.map((k) =>
    folder(
      `lib/${k}`,
      SOURCE_KINDS[k].label,
      SOURCES.filter((s) => s.kind === k).map((s) => ({
        type: "source" as const,
        id: `lib/${k}/${s.id}`,
        name: s.code ? `${s.code} ${s.title}` : s.title,
        sourceId: s.id,
      })),
    ),
  ).filter((f) => f.type === "folder" && f.children.length > 0),
  "平台提供",
)

export function rootsFor(space: Space, projectIds: string[]): DriveNode[] {
  if (space === "public") return [LIBRARY_TREE]
  if (space === "mine") return [MY_TREE]
  return PROJECTS.filter((p) => projectIds.includes(p.id)).map((p) => PROJECT_TREES[p.id])
}

/** 所有空间的根（用来建索引、按链接定位文件） */
export function allRoots(projectIds: string[]): DriveNode[] {
  return [LIBRARY_TREE, ...rootsFor("project", projectIds), MY_TREE]
}
