import { CloudSunIcon, SunIcon, WindIcon, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { Project } from "@/lib/projects/types"
import { GhGenerator } from "./gh-generator"

interface Tool {
  name: string
  icon: LucideIcon
  status: "ready" | "planned"
  desc: string
  inputs: string[]
  output: string
}

/**
 * 分析工具：以项目为单位运行，自动带入项目的位置、体块模型等；结果存回项目文件夹。
 * 结果是“分析报告”，是否满足要求由本人判断。
 */
export function ToolsTab({ project }: { project: Project }) {
  const loc = project.location
  const where = loc.lat ? `${loc.city}${loc.district}（${loc.lat}°N, ${loc.lng}°E）` : `${loc.city}${loc.district}`
  const tools: Tool[] = [
    {
      name: "日照分析",
      icon: SunIcon,
      status: "planned",
      desc: "大寒日 / 冬至日有效日照时数",
      inputs: [`项目位置：${where}`, "体块模型：从项目文件中选择（.3dm）", `计算方法：按匹配到的${loc.city}地方标准`],
      output: "日照分析报告（PDF）→ 本项目 01 资料依据",
    },
    {
      name: "光污染分析",
      icon: CloudSunIcon,
      status: "planned",
      desc: "幕墙反射光对周边道路、住宅的影响",
      inputs: [`项目位置：${where}`, "体块模型与立面材质", "周边敏感点"],
      output: "光污染分析报告（PDF）→ 本项目 01 资料依据",
    },
    {
      name: "风环境模拟",
      icon: WindIcon,
      status: "planned",
      desc: "行人高度风速、风速放大系数",
      inputs: [`项目位置：${where}（自动带入当地主导风向）`, "体块模型与周边建筑"],
      output: "风环境模拟报告（PDF）→ 本项目 01 资料依据",
    },
  ]

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        工具会自动带入本项目的位置和模型，结果保存回项目文件夹。分析报告只提供数据，是否满足要求由本人判断。
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <GhGenerator />
        {tools.map(({ name, icon: Icon, status, desc, inputs, output }) => (
          <div key={name} className="rounded-xl border bg-surface p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-surface-sunken">
                <Icon className="size-5 text-muted-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Badge variant={status === "ready" ? "neutral" : "outline"}>{status === "ready" ? "已有 · 待接入" : "规划中"}</Badge>
            </div>
            <p className="mt-4 text-xs font-medium text-muted-foreground">自动带入</p>
            <ul className="mt-1 space-y-0.5 text-sm">
              {inputs.map((i) => (
                <li key={i}>· {i}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs font-medium text-muted-foreground">产出</p>
            <p className="mt-1 text-sm">{output}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
