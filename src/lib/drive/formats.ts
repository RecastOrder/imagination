/**
 * 文件格式清单：每种格式用哪个查看器、目前支持到什么程度。
 * 查看器注册表、目录树图标、样张页的“支持矩阵”都读这一份，保证说法一致。
 *
 * 支持程度：
 * - full    浏览器里直接打开（第一期，已实现）
 * - phase2  需要服务器转换（Office→PDF、DWG→PDF、RAR/7z 解包等），第二期
 * - phase3  需要商业授权或云服务评估（DWG 图层 / 测量、Revit），第三期
 * - info    不预览，只显示信息并提供下载
 */
export type ViewerKey = "pdf" | "image" | "markdown" | "text" | "table" | "model" | "archive" | "video" | "audio" | "pending"
export type Support = "full" | "phase2" | "phase3" | "info"
export type FormatGroup = "文档" | "图片" | "图纸" | "三维" | "表格" | "压缩包" | "音视频" | "其他"

export interface FormatInfo {
  label: string
  group: FormatGroup
  viewer: ViewerKey
  support: Support
  /** 暂不支持时给用户的说明 */
  note?: string
}

const F = (label: string, group: FormatGroup, viewer: ViewerKey, support: Support, note?: string): FormatInfo => ({
  label,
  group,
  viewer,
  support,
  note,
})

const OFFICE_NOTE = "第二期：服务器将其转换为 PDF 后在线预览（LibreOffice / OnlyOffice 私有部署，文件不出公司）"

export const FORMATS: Record<string, FormatInfo> = {
  pdf: F("PDF", "文档", "pdf", "full"),
  md: F("Markdown", "文档", "markdown", "full"),
  txt: F("文本", "文档", "text", "full"),
  json: F("JSON", "文档", "text", "full"),
  csv: F("CSV 表格", "表格", "table", "full"),
  png: F("PNG 图片", "图片", "image", "full"),
  jpg: F("JPG 图片", "图片", "image", "full"),
  jpeg: F("JPG 图片", "图片", "image", "full"),
  webp: F("WebP 图片", "图片", "image", "full"),
  gif: F("GIF 图片", "图片", "image", "full"),
  svg: F("SVG 矢量图", "图片", "image", "full"),
  "3dm": F("Rhino 模型", "三维", "model", "full"),
  stl: F("STL 模型", "三维", "model", "full"),
  obj: F("OBJ 模型", "三维", "model", "full"),
  glb: F("glTF 模型", "三维", "model", "full"),
  gltf: F("glTF 模型", "三维", "model", "full"),
  zip: F("ZIP 压缩包", "压缩包", "archive", "full"),
  mp4: F("MP4 视频", "音视频", "video", "full"),
  webm: F("WebM 视频", "音视频", "video", "full"),
  mp3: F("MP3 音频", "音视频", "audio", "full"),

  docx: F("Word 文档", "文档", "pending", "phase2", OFFICE_NOTE),
  doc: F("Word 文档（旧版）", "文档", "pending", "phase2", OFFICE_NOTE),
  xlsx: F("Excel 表格", "表格", "pending", "phase2", OFFICE_NOTE),
  xls: F("Excel 表格（旧版）", "表格", "pending", "phase2", OFFICE_NOTE),
  pptx: F("PPT 演示", "文档", "pending", "phase2", OFFICE_NOTE),
  wps: F("WPS 文字", "文档", "pending", "phase2", OFFICE_NOTE),
  et: F("WPS 表格", "表格", "pending", "phase2", OFFICE_NOTE),
  heic: F("HEIC 照片", "图片", "pending", "phase2", "第二期：服务器转码为 JPG 后显示（苹果手机默认格式）"),
  tif: F("TIFF 图片", "图片", "pending", "phase2", "第二期：服务器切成瓦片，支持超大扫描图局部放大"),
  tiff: F("TIFF 图片", "图片", "pending", "phase2", "第二期：服务器切成瓦片，支持超大扫描图局部放大"),
  rar: F("RAR 压缩包", "压缩包", "pending", "phase2", "第二期：由服务器解包后，像 ZIP 一样在左侧展开浏览"),
  "7z": F("7z 压缩包", "压缩包", "pending", "phase2", "第二期：由服务器解包后，像 ZIP 一样在左侧展开浏览"),
  ifc: F("IFC 模型", "三维", "pending", "phase2", "第二期：用开源 web-ifc 在浏览器中查看构件和属性"),
  dwg: F(
    "DWG 图纸",
    "图纸",
    "pending",
    "phase2",
    "第二期：服务器转换为 PDF / 图片快照预览（可缩放）。第三期再评估商业 SDK，支持图层开关与测量",
  ),
  dxf: F("DXF 图纸", "图纸", "pending", "phase2", "第二期：同 DWG"),
  rvt: F("Revit 模型", "三维", "pending", "phase3", "第三期：需要云端转换服务；建议先从 Revit 导出 IFC 再上传"),
  skp: F("SketchUp 模型", "三维", "pending", "phase3", "第三期：需要转换为 glTF；建议先导出 glTF / OBJ 再上传"),
  gh: F("Grasshopper 定义", "三维", "pending", "info", "只能查看文件信息；运行电池图需要 Rhino.Compute 服务器，暂不计划"),
}

export function extOf(name: string) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/)
  return m ? m[1] : ""
}

export function formatOf(name: string): FormatInfo {
  return FORMATS[extOf(name)] ?? F("未知格式", "其他", "pending", "info", "这种格式暂时不能预览，可以下载后用本机程序打开")
}

export const SUPPORT_LABEL: Record<Support, string> = {
  full: "可直接打开",
  phase2: "第二期支持",
  phase3: "第三期评估",
  info: "仅显示信息",
}
