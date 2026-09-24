import type { SourceFilters } from "@/lib/sources/types"
import type { ChatMode } from "./modes"

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
  /** 联想（仅发散模式）：没有权威出处的启发性内容，界面上用虚线和“联想”标签区分 */
  | { type: "idea"; content: string; refs?: string[] }
  /** 提示：找不到出处、引用的规范已被替代等 */
  | {
      type: "notice"
      tone: "info" | "warning"
      title: string
      content: string
      /** 例如“换成发散模式再问一次” */
      action?: { label: string; switchTo: ChatMode }
    }

export type BlockType = Block["type"]

export interface Message {
  id: string
  role: "user" | "assistant"
  blocks: Block[]
  /** 这条回答是用哪种模式生成的 */
  mode?: ChatMode
  /** assistant 消息正在流式输出 */
  streaming?: boolean
  /** 工具过程提示，如“正在检索 9 份资料…” */
  status?: string
}
