/**
 * 权限档位（项目成员和个人共享用同一套词）：
 * - view：仅浏览——打开、下载
 * - edit：浏览 + 编辑——还能标注、测量、改指标、加依据、上传新版本
 * “管理”（改项目信息、调整谁有什么权限）不在这里：只属于项目负责人 / 文件主人 / 管理员。
 */
export type AccessLevel = "view" | "edit"

export const ACCESS_LEVELS: Record<AccessLevel, { label: string; desc: string }> = {
  view: { label: "仅浏览", desc: "可以打开、下载" },
  edit: { label: "浏览 + 编辑", desc: "还可以标注、测量、修改内容" },
}
