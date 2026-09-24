"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  BookMarkedIcon,
  CornerDownRightIcon,
  MessageSquareQuoteIcon,
  NotebookPenIcon,
  QuoteIcon,
  SparklesIcon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Segmented } from "@/components/ui/segmented"
import { Composer } from "@/components/chat/composer"
import { Thread } from "@/components/chat/thread"
import { useMockChat } from "@/components/chat/use-mock-chat"
import { SourceKindIcon } from "@/components/source/source-kind-badge"
import { useLocalStore } from "@/hooks/use-local-store"
import { useMinWidth } from "@/hooks/use-media-query"
import { addNote, notebooksStore, notesStore, removeNote, updateNote, type Note, type NoteKind } from "@/lib/notebook/store"
import { getSource } from "@/lib/sources/mock"
import { cn } from "@/lib/utils"

const KIND_META: Record<NoteKind, { label: string; icon: LucideIcon }> = {
  excerpt: { label: "摘录", icon: QuoteIcon },
  answer: { label: "AI 回答", icon: MessageSquareQuoteIcon },
  memo: { label: "备忘", icon: NotebookPenIcon },
}

type Pane = "notes" | "sources" | "ai"

/**
 * 笔记本详情（参考 NotebookLM）：
 *   来源清单 | 笔记（摘录、回答、备忘） | 只在本笔记本范围内回答的 AI
 * 手机上三栏改为顶部分段切换。
 */
export function NotebookView({ id }: { id: string }) {
  const [notebooks] = useLocalStore(notebooksStore)
  const [allNotes] = useLocalStore(notesStore)
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)
  const [pane, setPane] = useState<Pane>("notes")
  // AI 面板有自己的对话状态，只挂载一份：桌面放右栏，手机放在“AI”分段里
  const isLg = useMinWidth("lg")

  const notebook = notebooks.find((n) => n.id === id)
  const notes = allNotes.filter((n) => n.notebookId === id)
  const sourceIds = Array.from(new Set(notes.map((n) => n.sourceId).filter((s): s is string => !!s)))
  const shown = sourceFilter ? notes.filter((n) => n.sourceId === sourceFilter) : notes

  if (!notebook) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-medium">没有找到这个笔记本</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/notebook">返回笔记本列表</Link>
        </Button>
      </div>
    )
  }

  const sourcesPane = (
    <SourcesPane notes={notes} sourceIds={sourceIds} value={sourceFilter} onChange={setSourceFilter} />
  )
  const notesPane = (
    <NotesPane notebookId={id} notes={shown} filtered={!!sourceFilter} onClearFilter={() => setSourceFilter(null)} />
  )
  const aiPane = <AiPane notebookTitle={notebook.title} sourceIds={sourceIds} noteCount={notes.length} />

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b px-3 py-2.5 sm:px-5">
        <Button asChild variant="ghost" size="icon-sm" aria-label="返回笔记本列表">
          <Link href="/notebook">
            <ArrowLeftIcon />
          </Link>
        </Button>
        <BookMarkedIcon className="size-4 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold">{notebook.title}</h1>
          {notebook.desc && <p className="truncate text-xs text-muted-foreground">{notebook.desc}</p>}
        </div>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {notes.length} 条笔记 · {sourceIds.length} 份来源
        </span>
      </header>

      {/* 桌面三栏 / 手机分段切换：用 CSS 断点决定显示哪套，服务端渲染时就正确 */}
      <div className="hidden min-h-0 flex-1 lg:flex">
        <aside className="hidden w-60 shrink-0 overflow-y-auto border-r bg-sidebar/50 p-3 xl:block">{sourcesPane}</aside>
        <div className="min-w-0 flex-1 overflow-y-auto">{notesPane}</div>
        {isLg && <aside className="flex w-[380px] shrink-0 flex-col border-l bg-surface">{aiPane}</aside>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <div className="border-b px-3 py-2">
          <Segmented
            label="面板"
            value={pane}
            onChange={setPane}
            className="w-full [&>button]:flex-1 [&>button]:justify-center"
            options={[
              { value: "notes", label: `笔记 ${notes.length}` },
              { value: "sources", label: `来源 ${sourceIds.length}` },
              { value: "ai", label: <><SparklesIcon />AI</> },
            ]}
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {pane === "notes" ? notesPane : pane === "sources" ? <div className="p-3">{sourcesPane}</div> : !isLg && aiPane}
        </div>
      </div>
    </div>
  )
}

function SourcesPane({
  notes,
  sourceIds,
  value,
  onChange,
}: {
  notes: Note[]
  sourceIds: string[]
  value: string | null
  onChange: (id: string | null) => void
}) {
  return (
    <div>
      <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">来源 · 点击筛选笔记</p>
      {sourceIds.length === 0 && <p className="px-2 text-sm text-muted-foreground">还没有来自资料的摘录</p>}
      <div className="space-y-0.5">
        {sourceIds.map((sid) => {
          const s = getSource(sid)
          if (!s) return null
          const active = value === sid
          return (
            <button
              key={sid}
              type="button"
              onClick={() => onChange(active ? null : sid)}
              aria-pressed={active}
              className={cn(
                "flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                active && "bg-primary-subtle text-primary-subtle-foreground hover:bg-primary-subtle",
              )}
            >
              <SourceKindIcon kind={s.kind} className={cn("mt-0.5 size-3.5 shrink-0 text-muted-foreground", active && "text-primary")} />
              <span className="min-w-0 flex-1 leading-snug">{s.title}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{notes.filter((n) => n.sourceId === sid).length}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function NotesPane({
  notebookId,
  notes,
  filtered,
  onClearFilter,
}: {
  notebookId: string
  notes: Note[]
  filtered: boolean
  onClearFilter: () => void
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <form
        className="mb-6"
        onSubmit={(e) => {
          e.preventDefault()
          const f = e.currentTarget
          const text = new FormData(f).get("memo")?.toString().trim()
          if (!text) return
          addNote({ notebookId, kind: "memo", text })
          f.reset()
        }}
      >
        <div className="flex gap-2">
          <input
            name="memo"
            placeholder="写一条备忘，回车保存…"
            className="h-10 flex-1 rounded-lg border border-input bg-surface px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
          />
          <Button type="submit" variant="outline" className="h-10">
            添加
          </Button>
        </div>
      </form>

      {filtered && (
        <button type="button" onClick={onClearFilter} className="mb-3 cursor-pointer text-xs text-primary hover:underline">
          正在按来源筛选，点击显示全部
        </button>
      )}

      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-14 text-center">
          <p className="font-medium">笔记本还是空的</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            在阅读模式中选中文字，点“存入笔记本”；或在对话里点回答下方的“存入笔记本”。
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/library">去资料库找资料</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} />
          ))}
        </ul>
      )}
    </div>
  )
}

function NoteCard({ note }: { note: Note }) {
  const [editing, setEditing] = useState(false)
  const meta = KIND_META[note.kind]
  const source = note.sourceId ? getSource(note.sourceId) : undefined
  const section = source?.sections.find((s) => s.id === note.sectionId)

  return (
    <li className="group rounded-lg border bg-surface p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <meta.icon className="size-3.5" />
        {meta.label}
        <span aria-hidden>·</span>
        <time>{new Date(note.createdAt).toLocaleDateString("zh-CN")}</time>
        <button
          type="button"
          onClick={() => removeNote(note.id)}
          className="ml-auto cursor-pointer rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent hover:text-destructive focus-visible:opacity-100"
          aria-label="删除这条笔记"
        >
          <Trash2Icon className="size-3.5" />
        </button>
      </div>

      <p
        className={cn(
          "mt-2 leading-relaxed whitespace-pre-wrap",
          note.kind === "excerpt" ? "border-l-2 border-border-strong pl-3 font-serif text-[15px] leading-[1.85]" : "text-sm",
        )}
      >
        {note.text}
      </p>

      {note.fileRef && (
        <Link
          href={`/browse?f=${encodeURIComponent(note.fileRef.id)}`}
          className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-md text-xs text-muted-foreground hover:text-primary"
        >
          <CornerDownRightIcon className="size-3.5 shrink-0" />
          <span className="truncate">
            {note.fileRef.name}
            {note.page ? ` · 第 ${note.page} 页` : ""}
          </span>
        </Link>
      )}
      {/* 回链：点击回到原文的对应位置 */}
      {source && (
        <Link
          href={`/library/${source.id}${section ? `#${section.id}` : ""}`}
          className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-md text-xs text-muted-foreground hover:text-primary"
        >
          <CornerDownRightIcon className="size-3.5 shrink-0" />
          <span className="truncate">
            《{source.title}》{section ? ` ${section.title}` : ""}
            {note.page ? ` · p.${note.page}` : ""}
          </span>
        </Link>
      )}

      {editing ? (
        <textarea
          autoFocus
          defaultValue={note.comment}
          placeholder="写下你的批注…"
          onBlur={(e) => {
            updateNote(note.id, { comment: e.target.value.trim() || undefined })
            setEditing(false)
          }}
          className="mt-3 block w-full resize-none rounded-md border border-input bg-surface-sunken px-3 py-2 text-sm outline-none focus:border-ring"
          rows={2}
        />
      ) : note.comment ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 block w-full cursor-text rounded-md bg-surface-sunken px-3 py-2 text-left text-sm"
        >
          <span className="text-xs text-muted-foreground">批注：</span>
          {note.comment}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-2 cursor-pointer text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100 max-md:opacity-100"
        >
          + 添加批注
        </button>
      )}
    </li>
  )
}

function AiPane({ notebookTitle, sourceIds, noteCount }: { notebookTitle: string; sourceIds: string[]; noteCount: number }) {
  const { messages, send, stop, busy } = useMockChat((q) =>
    sourceIds.length
      ? {
          status: `正在阅读本笔记本的 ${sourceIds.length} 份来源和 ${noteCount} 条笔记…`,
          blocks: [
            {
              type: "text",
              content: `（演示回答）关于“${q.slice(0, 20)}”，只根据本笔记本内的资料作答 [1]。你的个人批注会作为补充参考，但不会被当作权威出处。`,
              citations: [sourceIds[0]],
            },
            { type: "sources", sourceIds },
          ],
        }
      : {
          status: "正在阅读笔记…",
          blocks: [
            {
              type: "notice",
              tone: "info",
              title: "这个笔记本还没有来源资料",
              content: "先从资料库摘录一些内容进来，AI 才能在这个范围内回答。",
            },
          ],
        },
  )
  const router = useRouter()
  const ctx = { peekId: null, openPeek: (id: string) => router.push(`/library/${id}`) }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <SparklesIcon className="size-4 text-primary" />
        <span className="text-sm font-medium">在本笔记本中提问</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">AI 只会根据这个笔记本里的来源和笔记回答，范围小、更准确。</p>
            {["把这些摘录整理成一页设计说明", "这些资料之间有冲突的地方吗？"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => send(p)}
                className="block w-full cursor-pointer rounded-lg border bg-background px-3 py-2 text-left text-sm hover:border-border-strong"
              >
                {p}
              </button>
            ))}
          </div>
        ) : (
          <Thread messages={messages} ctx={ctx} />
        )}
      </div>
      <div className="p-3">
        <Composer
          size="md"
          onSend={send}
          onStop={stop}
          busy={busy}
          placeholder="就这个笔记本提问…"
          context={
            <Badge variant="outline" className="max-w-full">
              <span className="truncate">范围：{notebookTitle}</span>
            </Badge>
          }
        />
      </div>
    </div>
  )
}
