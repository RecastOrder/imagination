/** 通知（已定：只通知被 @ 的人）。前后端共用的类型 */
export interface AppNotification {
  id: string
  to: string
  kind: "mention"
  from: string
  fromName: string
  /** 一句话：在哪里、说了什么 */
  title: string
  text: string
  href: string
  at: number
  readAt?: number
}
