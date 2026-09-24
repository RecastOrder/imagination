import type { AccessLevel } from "@/lib/access"

/** 文件浏览里用到的项目摘要（由服务端按权限筛好后传给页面） */
export interface ProjectSummary {
  id: string
  name: string
  hint: string
  /** 我在这个项目里的权限：仅浏览 / 浏览 + 编辑 */
  access: AccessLevel
}
