import { SOURCE_KINDS, SOURCE_KIND_ORDER } from "@/lib/sources/kinds"
import { SOURCES } from "@/lib/sources/mock"
import type { ProjectSummary } from "./projects"
import type { DriveNode } from "./types"

/**
 * 文件浏览的三个空间（已定）：
 * - 公共：平台资料库（规范、图集、书籍…），按账号的资料范围权限显示
 * - 项目：只显示自己参与的项目；项目成员共享
 * - 我的：默认只有自己能看到；可以把文件 / 文件夹共享给同事（仅浏览 或 浏览 + 编辑）
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
  if (id.startsWith("me/") || id === SHARED_ROOT_ID) return "mine"
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

/**
 * 我的：个人文件。节点 id 带上主人的邮箱（me/邮箱/…），
 * 这样共享给别人时，对方拿到的是同一个 id——链接、标注都能对上。
 * 演示中每个人的内容是同一份示例。
 */
export function myTree(email: string): DriveNode {
  const id = `me/${email}`
  return folder(
    id,
    "我的文件",
    [
      file(`${id}/notes`, "我的笔记.md", "my-notes.md", 283, 23),
      folder(`${id}/ref`, "参考图片", [file(`${id}/ref/photo`, "街道界面参考.jpg", "site-photo.jpg", 109547, 9)]),
      folder(`${id}/meeting`, "会议纪要", [file(`${id}/meeting/0918`, "会议纪要-0918.txt", "minutes-0918.txt", 236, 18)]),
    ],
    "默认仅自己可见",
  )
}

/** 个人文件的主人：me/邮箱/… → 邮箱 */
export function ownerOf(id: string): string | null {
  const m = /^me\/([^/!]+)/.exec(id)
  return m ? m[1] : null
}

/** 在一棵树里按 id 找节点 */
export function findNode(root: DriveNode, id: string): DriveNode | null {
  if (root.id === id) return root
  if (root.type !== "folder") return null
  for (const c of root.children) {
    const hit = findNode(c, id)
    if (hit) return hit
  }
  return null
}

/** “共享给我的”：别人共享来的文件 / 文件夹，放在“我的”空间里自己的文件下面 */
export const SHARED_ROOT_ID = "shared"
export function sharedRoot(items: DriveNode[]): DriveNode {
  return folder(SHARED_ROOT_ID, "共享给我的", items, items.length ? `${items.length} 项` : undefined)
}

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

/** 新项目还没有文件时，按建议的固定顶层结构生成空文件夹 */
function emptyProject(p: ProjectSummary): DriveNode {
  const id = `proj/${p.id}`
  return folder(
    id,
    p.name,
    ["00 收件箱", "01 资料依据", "02 设计过程", "03 成果", "04 往来", "99 归档"].map((n) => folder(`${id}/${n.slice(0, 2)}`, n, [])),
    p.hint,
  )
}

/** 每个空间的根：公共 = 资料库；项目 = 我参与的项目；我的 = 自己的文件 + 共享给我的 */
export function rootsFor(space: Space, projects: ProjectSummary[], mine: DriveNode[]): DriveNode[] {
  if (space === "public") return [LIBRARY_TREE]
  if (space === "mine") return mine
  return projects.map((p) => {
    const t = PROJECT_TREES[p.id]
    return t && t.type === "folder" ? { ...t, name: p.name, hint: p.hint } : emptyProject(p)
  })
}

/** 所有空间的根（用来建索引、按链接定位文件） */
export function allRoots(projects: ProjectSummary[], mine: DriveNode[]): DriveNode[] {
  return [LIBRARY_TREE, ...rootsFor("project", projects, mine), ...mine]
}
