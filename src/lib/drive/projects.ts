/**
 * 项目（演示数据）。项目带有地区、类型、阶段——以后会自动成为检索条件（项目模式）。
 * 成员才能看到项目文件；管理员可以看到全部。上线后存数据库，由项目负责人维护成员。
 */
export interface Project {
  id: string
  name: string
  region: string
  type: string
  stage: string
  members: string[]
}

export const PROJECTS: Project[] = [
  {
    id: "housing",
    name: "某住宅项目",
    region: "上海",
    type: "住宅",
    stage: "方案",
    members: ["zhang.ming@studio.cn", "li.na@studio.cn", "wang.lei@studio.cn", "chen.jing@studio.cn"],
  },
  {
    id: "school",
    name: "某学校项目",
    region: "杭州",
    type: "学校",
    stage: "初设",
    members: ["zhang.ming@studio.cn", "zhao.min@studio.cn", "liu.yang@studio.cn"],
  },
]

/** 这个人能看到哪些项目（服务端调用） */
export function projectsFor(email: string, isAdmin: boolean): string[] {
  return PROJECTS.filter((p) => isAdmin || p.members.includes(email)).map((p) => p.id)
}
