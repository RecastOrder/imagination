import type { SourceFilters } from "@/lib/sources/types"

/**
 * 内容块（Block）：一条 AI 回答由若干个块组成。
 * 后端只返回数据，前端按 type 查注册表找组件渲染（见 components/blocks/registry.tsx）。
 * 以后新增一种结果（比如“建筑项目卡”“图纸对比”），只要加一个类型 + 一个组件。
 */
export type Block =
  /** 文字回答。content 里的 [1][2] 对应 citations 数组里的资料 id */
  | { type: "text"; content: string; citations?: string[] }
  /** 引用的资料列表 */
  | { type: "sources"; sourceIds: string[] }
  /** 图片结果（目前用占位色块） */
  | { type: "images"; images: { id: string; caption: string; sourceId?: string; tone: number }[] }
  /** AI 把自然语言解析成的检索条件，可以一键带到资料库继续筛选 */
  | { type: "filters"; filters: SourceFilters; total: number }

export type BlockType = Block["type"]

export interface Message {
  id: string
  role: "user" | "assistant"
  blocks: Block[]
  /** assistant 消息正在流式输出 */
  streaming?: boolean
  /** 工具过程提示，如“正在检索 9 份资料…” */
  status?: string
}
