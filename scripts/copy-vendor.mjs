// 把浏览器端查看器需要的静态资源从 node_modules 复制到 public/vendor（不提交到仓库）。
// 在 npm install 之后自动运行（见 package.json 的 postinstall）。
import { cpSync, existsSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const nm = (...p) => join(root, "node_modules", ...p)
const out = (...p) => join(root, "public", "vendor", ...p)

const copies = [
  // PDF.js：后台解析线程 + 中文字符映射表（显示中文 PDF 必需）+ 标准字体
  // 用兼容版（legacy）：包含新 JavaScript 语法的补丁，覆盖更多浏览器版本
  [nm("pdfjs-dist", "legacy", "build", "pdf.worker.min.mjs"), out("pdfjs", "pdf.worker.min.mjs")],
  [nm("pdfjs-dist", "cmaps"), out("pdfjs", "cmaps")],
  [nm("pdfjs-dist", "standard_fonts"), out("pdfjs", "standard_fonts")],
  // Rhino 官方 rhino3dm（WebAssembly）：浏览器里直接读 .3dm
  [nm("rhino3dm", "rhino3dm.js"), out("rhino3dm", "rhino3dm.js")],
  [nm("rhino3dm", "rhino3dm.wasm"), out("rhino3dm", "rhino3dm.wasm")],
]

for (const [from, to] of copies) {
  if (!existsSync(from)) {
    console.warn(`[copy-vendor] 跳过，找不到 ${from}`)
    continue
  }
  mkdirSync(dirname(to), { recursive: true })
  cpSync(from, to, { recursive: true })
}
console.log("[copy-vendor] 已复制查看器资源到 public/vendor")
