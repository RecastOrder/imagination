/** 所有查看器的统一输入：文件名 + 已经取回的内容（Blob）+ 可直接用于 <img>/<video> 的地址 */
export interface ViewerProps {
  name: string
  blob: Blob
  src: string
}
