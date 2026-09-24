/**
 * 文件浏览器的节点。平台资料库、个人文件、（以后的）NAS 与 OneDrive 都转换成这同一种结构，
 * 所以左侧目录树和中间的查看器只写一套。
 */
export type DriveNode =
  | { type: "folder"; id: string; name: string; children: DriveNode[]; hint?: string }
  | {
      type: "file"
      id: string
      name: string
      size?: number
      updatedAt?: number
      /** 普通文件：直接下载地址 */
      url?: string
      /** 压缩包里的文件：所在压缩包节点 id + 包内路径 */
      zip?: { archiveId: string; path: string }
      /** 压缩包本身：可以在目录树里展开 */
      archive?: boolean
    }
  /** 平台资料库里的一份资料（规范、书籍…），用阅读器视图显示 */
  | { type: "source"; id: string; name: string; sourceId: string }

export type DriveFile = Extract<DriveNode, { type: "file" }>
