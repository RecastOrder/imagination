/**
 * 在浏览器里读出 PDF 的文字（用 PDF.js，和查看器同一套，按需加载）。
 * 扫描件（图片）没有文字层，会返回空字符串——需要 OCR，接入 AI 后支持。
 */
export async function pdfText(data: ArrayBuffer, maxPages = 20): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs"
  const task = pdfjs.getDocument({
    data: new Uint8Array(data),
    cMapUrl: "/vendor/pdfjs/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "/vendor/pdfjs/standard_fonts/",
  })
  try {
    const doc = await task.promise
    let out = ""
    for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++) {
      const c = await (await doc.getPage(i)).getTextContent()
      out += c.items.map((x) => ("str" in x ? x.str + (x.hasEOL ? "\n" : "") : "")).join("") + "\n"
    }
    return out.trim()
  } finally {
    await task.destroy()
  }
}
