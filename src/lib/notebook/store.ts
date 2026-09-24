import { createLocalStore } from "@/lib/local-store"

/**
 * 笔记本：一个笔记本 ≈ 一个项目。
 * 笔记有三种来源：阅读时摘录（excerpt）、保存的 AI 回答（answer）、自己写的备忘（memo）。
 * 摘录永远带“回链”（资料 id + 章节 + 页码），点一下能回到原文。
 */
export interface Notebook {
  id: string
  title: string
  desc?: string
  createdAt: number
}

export type NoteKind = "excerpt" | "answer" | "memo"

export interface Note {
  id: string
  notebookId: string
  kind: NoteKind
  /** 摘录的原文 / 回答正文 / 备忘内容 */
  text: string
  /** 自己的批注 */
  comment?: string
  sourceId?: string
  sectionId?: string
  page?: number
  createdAt: number
}

/** 阅读器里的高亮（和笔记分开：高亮是“画线”，摘录是“抄到本子上”） */
export interface Highlight {
  id: string
  sourceId: string
  sectionId: string
  paragraph: number
  text: string
}

const now = Date.UTC(2026, 8, 20)

const SEED_NOTEBOOKS: Notebook[] = [
  { id: "nb-housing", title: "某住宅项目 · 日照与间距", desc: "方案阶段需要核对的规范与参考", createdAt: now },
  { id: "nb-light", title: "光与空间 · 灵感", desc: "关于自然光的案例与想法", createdAt: now },
]

const SEED_NOTES: Note[] = [
  {
    id: "n1",
    notebookId: "nb-housing",
    kind: "excerpt",
    text: "【示例占位文本】本段用于演示“日照与间距”在阅读模式中的排版效果。",
    comment: "和国标对照看，注意计算方法差异",
    sourceId: "dgj08-sh-housing",
    sectionId: "s2",
    page: 5,
    createdAt: now,
  },
  {
    id: "n2",
    notebookId: "nb-housing",
    kind: "memo",
    text: "甲方希望南侧沿街做退台，需要复核后排楼底层日照。",
    createdAt: now + 1000,
  },
  {
    id: "n3",
    notebookId: "nb-light",
    kind: "excerpt",
    text: "【示例占位文本】本段用于演示“光的十字”在阅读模式中的排版效果。",
    sourceId: "report-church-of-light",
    sectionId: "s2",
    page: 5,
    createdAt: now,
  },
]

export const notebooksStore = createLocalStore<Notebook[]>("nb:notebooks", SEED_NOTEBOOKS)
export const notesStore = createLocalStore<Note[]>("nb:notes", SEED_NOTES)
export const highlightsStore = createLocalStore<Highlight[]>("nb:highlights", [])
/** 最近使用的笔记本：摘录时默认存到这里 */
export const activeNotebookPref = createLocalStore<string>("nb:active", "nb-housing")

let seq = 0
export const newId = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`

export function addNote(note: Omit<Note, "id" | "createdAt">): Note {
  const full: Note = { ...note, id: newId("n"), createdAt: Date.now() }
  notesStore.write((ns) => [full, ...ns])
  activeNotebookPref.write(note.notebookId)
  return full
}

export function updateNote(id: string, patch: Partial<Note>) {
  notesStore.write((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n)))
}

export function removeNote(id: string) {
  notesStore.write((ns) => ns.filter((n) => n.id !== id))
}

export function createNotebook(title: string): Notebook {
  const nb: Notebook = { id: newId("nb"), title, createdAt: Date.now() }
  notebooksStore.write((l) => [...l, nb])
  return nb
}
