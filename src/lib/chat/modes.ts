import { LightbulbIcon, ScaleIcon, type LucideIcon } from "lucide-react"

/**
 * 对话的两种回答模式。
 * - rigorous 严谨：只用权威等级 1–2 的资料，每个结论必须有出处，找不到就明说
 * - divergent 发散：全部资料都可以用，允许联想；联想内容单独标出
 */
export type ChatMode = "rigorous" | "divergent"

export const CHAT_MODES: Record<ChatMode, { label: string; short: string; desc: string; icon: LucideIcon }> = {
  rigorous: {
    label: "严谨模式",
    short: "严谨",
    desc: "只引用规范、图集等权威资料，每句结论都有出处",
    icon: ScaleIcon,
  },
  divergent: {
    label: "发散模式",
    short: "发散",
    desc: "可以联想、类比，灵感内容会单独标出",
    icon: LightbulbIcon,
  },
}
