import { EMPTY, type FileAnnotations } from "@/lib/drive/annotations"
import { collection } from "./db"
import { cleanMark } from "./issues"

/**
 * 个人标注（已定：跟着账号走）。按“人 + 文件”存在服务器上，换电脑、换浏览器都还在；
 * 仍然只有自己看得到——接口只按当前登录的人读写自己的那一份。要给别人看请“发起问题”。
 */
const store = collection<FileAnnotations>("annotations")
const key = (email: string, fileId: string) => `${email}\u0000${fileId}`

export function getAnnotations(email: string, fileId: string): FileAnnotations {
  return store.get(key(email, fileId)) ?? EMPTY
}

export function saveAnnotations(email: string, fileId: string, raw: unknown): { ok: true; data: FileAnnotations } | { ok: false; error: string } {
  const r = raw as FileAnnotations
  if (!r || !Array.isArray(r.marks) || r.marks.length > 500) return { ok: false, error: "标注数据不正确" }
  const marks = r.marks.map((m) => cleanMark(m, true))
  if (marks.some((m) => !m)) return { ok: false, error: "标注数据不正确" }
  const scales: Record<string, number> = {}
  for (const [k, v] of Object.entries(r.scales ?? {})) {
    if ((k === "all" || /^\d{1,4}$/.test(k)) && typeof v === "number" && Number.isFinite(v) && v > 0) scales[k] = v
  }
  const data: FileAnnotations = { marks: marks as FileAnnotations["marks"], scales }
  if (data.marks.length === 0 && Object.keys(scales).length === 0) store.delete(key(email, fileId))
  else store.set(key(email, fileId), data)
  return { ok: true, data }
}
