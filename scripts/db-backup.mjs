// 数据库备份：npm run db:backup [目标目录]
// 用 SQLite 的 VACUUM INTO 生成一份完整、一致的副本（服务器运行中也可以做），文件名带时间。
import { mkdirSync, existsSync } from "node:fs"
import path from "node:path"

const { DatabaseSync } = process.getBuiltinModule("node:sqlite")
const dir = process.env.DATA_DIR || path.join(process.cwd(), ".data")
const src = path.join(dir, "imagination.db")
if (!existsSync(src)) {
  console.error(`找不到数据库：${src}`)
  process.exit(1)
}
const outDir = process.argv[2] || path.join(dir, "backups")
mkdirSync(outDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
const out = path.join(outDir, `imagination-${stamp}.db`)
new DatabaseSync(src).exec(`VACUUM INTO '${out.replace(/'/g, "''")}'`)
console.log(`已备份到 ${out}`)
