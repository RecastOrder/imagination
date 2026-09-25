import type { Mark } from "./annotations"

/**
 * 问题（Issue）：标注平时只有自己看得到；想让别人看，就把某条标注“发起为问题”。
 * 问题存在服务器上，能看这个文件的人都能看到、回复；有编辑权限的人可以关闭 / 重新打开。
 * 编号按范围递增：项目里是 #1 #2 …（整个项目统一编号），个人文件按主人统一编号。
 */
export interface IssueReply {
  id: string
  author: string
  authorName: string
  text: string
  at: number
}

export interface Issue {
  id: string
  /** 编号范围："proj:项目id" 或 "me:主人邮箱" */
  scope: string
  number: number
  fileId: string
  fileName: string
  /** 发起时那条标注的副本（位置、形状、批注文字） */
  mark: Mark
  /** 发起时的比例（每页面单位毫米数）：测量类问题让别人看到同样的长度 */
  scale?: number
  title: string
  status: "open" | "closed"
  author: string
  authorName: string
  createdAt: number
  replies: IssueReply[]
  closedBy?: string
  closedAt?: number
}

export const ISSUE_STATUS: Record<Issue["status"], string> = { open: "进行中", closed: "已关闭" }
