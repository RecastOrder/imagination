import type { Project } from "./types"

/** 演示用项目。上线后存数据库，由项目负责人维护 */
export const PROJECT_SEED: Project[] = [
  {
    id: "housing",
    name: "某住宅项目",
    type: "住宅",
    stage: "方案",
    location: { province: "上海市", city: "上海市", district: "徐汇区", address: "示例路 88 号地块（示例）", lat: 31.18, lng: 121.43 },
    members: [
      { email: "zhang.ming@studio.cn", role: "lead" },
      { email: "li.na@studio.cn", role: "member" },
      { email: "wang.lei@studio.cn", role: "member" },
      { email: "chen.jing@studio.cn", role: "member" },
    ],
    conditions: [
      { key: "far", label: "容积率", op: "<=", value: 2.5, source: "规划条件（示例）" },
      { key: "green", label: "绿地率", op: ">=", value: 35, unit: "%", source: "规划条件（示例）" },
      { key: "height", label: "建筑高度", op: "<=", value: 60, unit: "m", source: "规划条件（示例）" },
      { key: "coverage", label: "建筑密度", op: "<=", value: 25, unit: "%", source: "规划条件（示例）" },
      { key: "parking", label: "机动车停车位", op: ">=", value: 330, unit: "个", source: "规划条件（示例）" },
    ],
    metrics: { far: 2.48, green: 35.2, height: 62.4, coverage: 21.8, parking: undefined },
  },
  {
    id: "school",
    name: "某学校项目",
    type: "学校",
    stage: "初设",
    location: { province: "浙江省", city: "杭州市", district: "西湖区", address: "示例地块（示例）", lat: 30.26, lng: 120.13 },
    members: [
      { email: "zhao.min@studio.cn", role: "lead" },
      { email: "zhang.ming@studio.cn", role: "member" },
      { email: "liu.yang@studio.cn", role: "member" },
    ],
    conditions: [
      { key: "far", label: "容积率", op: "<=", value: 1.2, source: "规划条件（示例）" },
      { key: "green", label: "绿地率", op: ">=", value: 35, unit: "%", source: "规划条件（示例）" },
    ],
    metrics: { far: 1.05, green: 36 },
  },
]
