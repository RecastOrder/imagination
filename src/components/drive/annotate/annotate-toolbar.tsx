"use client"

import { CrosshairIcon, HandIcon, MapPinIcon, MessageSquareTextIcon, RulerIcon, SquareDashedIcon, type LucideIcon } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { Tool } from "./use-annotations"

const TOOLS: { value: Tool; label: string; hint: string; icon: LucideIcon; key: string }[] = [
  { value: "browse", label: "浏览", hint: "滚动、缩放、点选标注", icon: HandIcon, key: "V" },
  { value: "pin", label: "标记", hint: "点一下放一个编号标记，写批注", icon: MapPinIcon, key: "P" },
  { value: "rect", label: "框选", hint: "拖出一个框，圈出要讨论的范围", icon: SquareDashedIcon, key: "R" },
  { value: "measure", label: "测量", hint: "拖一条线量距离（按住 Shift 保持水平 / 垂直）", icon: RulerIcon, key: "M" },
  { value: "calibrate", label: "校准", hint: "沿一段已知尺寸拖一条线，输入实际长度", icon: CrosshairIcon, key: "C" },
]

/** 标注工具条：工具 + 标注数量（点击打开右侧列表）。键盘：V P R M C 切换，Esc 回到浏览 */
export function AnnotateToolbar({
  tool,
  onTool,
  count,
  panelOpen,
  onTogglePanel,
  calibrated,
  tools,
  note,
}: {
  tool: Tool
  onTool: (t: Tool) => void
  count: number
  panelOpen: boolean
  onTogglePanel: () => void
  calibrated: boolean
  /** 只显示这些工具（仅浏览权限时只有 浏览 / 测量 / 校准） */
  tools?: Tool[]
  /** 工具条末尾的说明 */
  note?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-1">
      <div role="radiogroup" aria-label="标注工具" className="flex rounded-md bg-secondary p-0.5">
        {TOOLS.filter((t) => !tools || tools.includes(t.value)).map(({ value, label, hint, icon: Icon, key }) => (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <button
                type="button"
                role="radio"
                aria-checked={tool === value}
                aria-label={label}
                onClick={() => onTool(value)}
                className={cn(
                  "relative flex h-7 cursor-pointer items-center gap-1 rounded-[5px] px-2 text-xs font-medium text-muted-foreground hover:text-foreground [&_svg]:size-3.5",
                  tool === value && "bg-surface text-foreground shadow-sm",
                )}
              >
                <Icon />
                <span className="hidden xl:inline">{label}</span>
                {value === "calibrate" && calibrated && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-success" aria-label="已校准" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {hint}（{key}）
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <button
        type="button"
        aria-pressed={panelOpen}
        onClick={onTogglePanel}
        className={cn(
          "flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground",
          panelOpen && "bg-accent text-foreground",
        )}
      >
        <MessageSquareTextIcon className="size-3.5" />
        标注 {count}
      </button>
      {note}
    </div>
  )
}
