/** 所有查看器的统一输入：文件名 + 已经取回的内容（Blob）+ 可直接用于 <img>/<video> 的地址 */
export interface ViewerProps {
  /** 文件节点 id：标注按它保存 */
  fileId: string
  name: string
  blob: Blob
  src: string
  /** 仅浏览权限：不能标注、测量 */
  readOnly?: boolean
  /** 打开后定位到这个问题（链接里的 ?issue=） */
  focusIssue?: string | null
  /**
   * 下载与打印（owner 2026-09-26「原件可以有下载打印的选项，但是需要给权限，暂时不开放给user」）：
   * 有「原件下载与打印」权限才传；不传就不显示按钮。download = 下载地址（服务端会再查一次权限）。
   */
  download?: string
  printable?: boolean
}
