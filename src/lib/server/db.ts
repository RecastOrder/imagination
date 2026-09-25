import { mkdirSync } from "node:fs"
import path from "node:path"
import type { DatabaseSync, StatementSync } from "node:sqlite"

/**
 * 数据库（第 ③ 步“后端地基”）。
 *
 * 现在用 Node 自带的 SQLite：一个文件（默认 .data/imagination.db），不需要单独装数据库服务，
 * 服务器重启数据还在；备份 = 复制这个文件。
 * 存法是“文档表”：每类数据一个集合，每条记录按 id 存一段 JSON。
 * 以后人多了换 PostgreSQL，只需要重写这个文件，调用它的代码不用改。
 */
const g = globalThis as unknown as { __db?: DatabaseSync }

/**
 * 用到时才加载 SQLite 模块，并只屏蔽它那条“实验功能”提示（Node 22 会打印；功能本身已稳定可用），
 * 其他警告照常输出。
 */
function loadSqlite(): typeof import("node:sqlite") {
  const emit = process.emitWarning
  process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
    const msg = typeof warning === "string" ? warning : warning.message
    if (/SQLite is an experimental feature/.test(msg)) return
    return (emit as (...a: unknown[]) => void).call(process, warning, ...rest)
  }) as typeof process.emitWarning
  try {
    return process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite")
  } finally {
    process.emitWarning = emit
  }
}

function open(): DatabaseSync {
  if (g.__db) return g.__db
  const dir = process.env.DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), ".data")
  mkdirSync(dir, { recursive: true })
  const db = new (loadSqlite().DatabaseSync)(path.join(dir, "imagination.db"))
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS docs (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (collection, id)
    );
    CREATE TABLE IF NOT EXISTS seeded (collection TEXT PRIMARY KEY, at INTEGER NOT NULL);
  `)
  return (g.__db = db)
}

export interface Collection<T> {
  get(id: string): T | undefined
  has(id: string): boolean
  set(id: string, value: T): void
  delete(id: string): boolean
  values(): T[]
}

/**
 * 一个集合。seed：第一次使用时写入的初始数据（只写一次；之后删光了也不会重新写入）。
 */
export function collection<T>(name: string, seed?: () => [string, T][]): Collection<T> {
  let stmts: Record<"get" | "set" | "del" | "all", StatementSync> | null = null
  const s = () => {
    if (stmts) return stmts
    const db = open()
    if (seed && !db.prepare("SELECT 1 FROM seeded WHERE collection = ?").get(name)) {
      const insert = db.prepare("INSERT OR IGNORE INTO docs (collection, id, data, updated_at) VALUES (?, ?, ?, ?)")
      db.exec("BEGIN")
      try {
        for (const [id, v] of seed()) insert.run(name, id, JSON.stringify(v), Date.now())
        db.prepare("INSERT INTO seeded (collection, at) VALUES (?, ?)").run(name, Date.now())
        db.exec("COMMIT")
      } catch (e) {
        db.exec("ROLLBACK")
        throw e
      }
    }
    stmts = {
      get: db.prepare("SELECT data FROM docs WHERE collection = ? AND id = ?"),
      set: db.prepare(
        "INSERT INTO docs (collection, id, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT (collection, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
      ),
      del: db.prepare("DELETE FROM docs WHERE collection = ? AND id = ?"),
      all: db.prepare("SELECT data FROM docs WHERE collection = ?"),
    }
    return stmts
  }
  return {
    get(id) {
      const row = s().get.get(name, id) as { data: string } | undefined
      return row ? (JSON.parse(row.data) as T) : undefined
    },
    has(id) {
      return !!s().get.get(name, id)
    },
    set(id, value) {
      s().set.run(name, id, JSON.stringify(value), Date.now())
    },
    delete(id) {
      return Number(s().del.run(name, id).changes) > 0
    },
    values() {
      return (s().all.all(name) as { data: string }[]).map((r) => JSON.parse(r.data) as T)
    },
  }
}
