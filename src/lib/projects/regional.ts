import type { ProjectLocation } from "./types"

/**
 * 地方要求：按“适用范围”挂在国家 / 省市 / 区三级。
 * 项目录入位置后，自动匹配出适用的全部要求——区里有特殊规定的，一并列出来。
 * 演示数据：国家级引用平台资料库里的示例规范；省市、区级条目均为【示例】，不是真实规定。
 */
export type Level = "国家" | "省市" | "区"

export interface Requirement {
  id: string
  level: Level
  title: string
  /** 适用范围：只写到哪一级，就对该级以下全部适用 */
  scope: { province?: string; city?: string; district?: string }
  /** 对应资料库里的资料（可在右侧预览 / 进入阅读模式） */
  sourceId?: string
  /** 适用的项目类型；不写表示全部 */
  types?: string[]
  summary: string
}

export const REQUIREMENTS: Requirement[] = [
  { id: "r-gb50352", level: "国家", title: "民用建筑设计统一标准", scope: {}, sourceId: "gb50352-2019", summary: "民用建筑通用要求" },
  { id: "r-gb50016", level: "国家", title: "建筑设计防火规范", scope: {}, sourceId: "gb50016-2014", summary: "防火分区、疏散、耐火等级" },
  { id: "r-gb50096", level: "国家", title: "住宅设计规范", scope: {}, sourceId: "gb50096-2011", types: ["住宅"], summary: "住宅套内空间、共用部分" },
  { id: "r-sh-housing", level: "省市", title: "上海市住宅设计标准", scope: { city: "上海市" }, sourceId: "dgj08-sh-housing", types: ["住宅"], summary: "日照计算方法与间距系数等地方要求" },
  { id: "r-sh-plan", level: "省市", title: "上海市城市规划管理技术规定（示例条目）", scope: { city: "上海市" }, summary: "建筑间距、退界、高度控制等（示例）" },
  { id: "r-xh-style", level: "区", title: "徐汇区风貌保护区附加要求（示例）", scope: { city: "上海市", district: "徐汇区" }, summary: "沿街立面材质、色彩与高度控制（示例）" },
  { id: "r-xh-green", level: "区", title: "徐汇区绿化配建补充要求（示例）", scope: { city: "上海市", district: "徐汇区" }, summary: "集中绿地位置与覆土要求（示例）" },
  { id: "r-pd-sponge", level: "区", title: "浦东新区海绵城市专项要求（示例）", scope: { city: "上海市", district: "浦东新区" }, summary: "年径流总量控制率（示例）" },
  { id: "r-hz-plan", level: "省市", title: "杭州市城市规划管理技术规定（示例条目）", scope: { city: "杭州市" }, summary: "建筑间距与日照（示例）" },
  { id: "r-hz-school", level: "省市", title: "浙江省中小学校建设标准（示例条目）", scope: { province: "浙江省" }, types: ["学校"], summary: "生均用地、运动场地（示例）" },
  { id: "r-xihu-view", level: "区", title: "西湖区景观视廊控制要求（示例）", scope: { city: "杭州市", district: "西湖区" }, summary: "高度与天际线控制（示例）" },
]

/** 可选的位置（演示）。上线后接行政区划数据 */
export const LOCATIONS: Record<string, Record<string, string[]>> = {
  上海市: { 上海市: ["徐汇区", "浦东新区", "黄浦区", "静安区"] },
  浙江省: { 杭州市: ["西湖区", "上城区", "滨江区"] },
}

export function matchRequirements(loc: ProjectLocation, type: string) {
  const ok = (r: Requirement) =>
    (!r.scope.province || r.scope.province === loc.province) &&
    (!r.scope.city || r.scope.city === loc.city) &&
    (!r.scope.district || r.scope.district === loc.district) &&
    (!r.types || r.types.includes(type))
  return REQUIREMENTS.filter(ok)
}
