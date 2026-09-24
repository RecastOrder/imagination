/** 所有查看器的统一输入：文件名 + 已经取回的内容（Blob）+ 可直接用于 <img>/<video> 的地址 */
export interface ViewerProps {
  /** 文件节点 id：标注按它保存 */
  fileId: string
  name: string
  blob: Blob
  src: string
}
