import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

/**
 * Office → PDF 转换（服务器上的 LibreOffice，文件不出公司）。
 *
 * - 按文件内容的 SHA-256 缓存：同一个文件只转换一次，之后秒开
 * - 每次转换用独立的临时配置目录，避免同时转换时互相锁住
 * - 最多同时转换 2 个，单个最长 60 秒
 * - 服务器需要安装 LibreOffice（writer / calc / impress）和中文字体，否则会乱码
 */
export const OFFICE_EXTS = ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "wps", "et", "dps", "odt", "ods", "odp", "rtf"]
const CACHE_DIR = process.env.OFFICE_CACHE_DIR ?? join(process.cwd(), ".cache", "office-previews")
const SOFFICE = process.env.SOFFICE_PATH ?? "soffice"
const MAX_CONCURRENT = 2
const TIMEOUT_MS = 60_000

let running = 0
const waiting: (() => void)[] = []
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT) await new Promise<void>((r) => waiting.push(r))
  running++
  try {
    return await fn()
  } finally {
    running--
    waiting.shift()?.()
  }
}

export class ConvertError extends Error {}

/** 同一份内容正在转换时，后来的请求等同一个结果，不重复转换 */
const inflight = new Map<string, Promise<Buffer>>()

export async function convertOfficeToPdf(bytes: Buffer, ext: string): Promise<Buffer> {
  if (!OFFICE_EXTS.includes(ext)) throw new ConvertError("不支持的文件格式")
  const hash = createHash("sha256").update(bytes).digest("hex")
  const cached = join(CACHE_DIR, `${hash}.pdf`)
  if (existsSync(cached)) return readFile(cached)
  const pending = inflight.get(hash)
  if (pending) return pending

  const job = slot(async () => {
    const work = await mkdtemp(join(tmpdir(), "office-"))
    try {
      const input = join(work, `input.${ext}`)
      await writeFile(input, bytes)
      await new Promise<void>((resolve, reject) => {
        // turbopackIgnore：这里调用的是系统里的 LibreOffice，不需要打包工具追踪文件
        execFile(
          /*turbopackIgnore: true*/ SOFFICE,
          [`-env:UserInstallation=file://${join(work, "profile")}`, "--headless", "--norestore", "--convert-to", "pdf", "--outdir", work, input],
          { timeout: TIMEOUT_MS },
          (err) => {
            if (!err) return resolve()
            const code = (err as NodeJS.ErrnoException).code
            reject(new ConvertError(code === "ENOENT" ? "服务器没有安装 LibreOffice，暂时无法预览 Office 文件" : "转换失败或超时，文件可能已损坏或加密"))
          },
        )
      })
      const pdfName = (await readdir(work)).find((f) => f.endsWith(".pdf"))
      if (!pdfName) throw new ConvertError("转换失败：文件可能已损坏、加密，或格式不受支持")
      const pdf = await readFile(join(work, pdfName))
      await mkdir(CACHE_DIR, { recursive: true })
      const tmp = `${cached}.${process.pid}.tmp`
      await writeFile(tmp, pdf)
      await rename(tmp, cached)
      return pdf
    } finally {
      await rm(work, { recursive: true, force: true })
    }
  })
  inflight.set(hash, job)
  try {
    return await job
  } finally {
    inflight.delete(hash)
  }
}
