"use client"

import { useRef, useState } from "react"

import { cn } from "@/lib/utils"

export interface Person {
  email: string
  name: string
}

/** 文字里提到了哪些人（按“@名字”判断；同单位里名字不重复） */
export function mentionsIn(text: string, people: Person[]) {
  return people.filter((p) => text.includes(`@${p.name}`)).map((p) => p.email)
}

/** 显示时把“@名字”加粗，一眼看出提到了谁 */
export function MentionText({ text }: { text: string }) {
  const parts = text.split(/(@[^\s@，,。；;：:]+)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("@") ? (
          <span key={i} className="font-medium text-foreground">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  )
}

/**
 * 可以 @ 人的输入框（像微信 / 飞书 / GitHub）：打“@”弹出能看这个文件的人，
 * ↑↓ 选择、Enter 或 Tab 确认、Esc 关闭。只有被 @ 的人会收到通知（已定）。
 */
export function MentionInput({
  value,
  onChange,
  people,
  multiline,
  className,
  ...rest
}: {
  value: string
  onChange: (v: string) => void
  people: Person[]
  multiline?: boolean
  className?: string
  placeholder?: string
  autoFocus?: boolean
  "aria-label"?: string
  rows?: number
}) {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null)
  const [query, setQuery] = useState<{ text: string; start: number } | null>(null)
  const [active, setActive] = useState(0)
  const matches = query
    ? people.filter((p) => p.name.includes(query.text) || p.email.startsWith(query.text.toLowerCase())).slice(0, 6)
    : []
  const open = !!query && matches.length > 0

  const detect = (v: string, caret: number) => {
    const m = /(^|\s)@([^\s@]*)$/.exec(v.slice(0, caret))
    setQuery(m ? { text: m[2], start: caret - m[2].length - 1 } : null)
    setActive(0)
  }

  const pick = (p: Person) => {
    if (!query) return
    const el = ref.current
    const caret = el?.selectionStart ?? value.length
    const next = `${value.slice(0, query.start)}@${p.name} ${value.slice(caret)}`
    onChange(next)
    setQuery(null)
    const pos = query.start + p.name.length + 2
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(pos, pos)
    })
  }

  const props = {
    ...rest,
    ref,
    value,
    role: "combobox" as const,
    "aria-expanded": open,
    "aria-autocomplete": "list" as const,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      onChange(e.target.value)
      detect(e.target.value, e.target.selectionStart ?? e.target.value.length)
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (!open) return
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault()
        setActive((i) => (i + (e.key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length)
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        pick(matches[active])
      } else if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        setQuery(null)
      }
    },
    onBlur: () => setTimeout(() => setQuery(null), 150),
    className: cn(
      "block w-full rounded-md border border-input bg-surface px-2.5 text-sm outline-none focus:border-ring",
      multiline ? "resize-none py-1.5" : "h-8",
      className,
    ),
  }

  return (
    <div className="relative">
      {multiline ? <textarea {...props} /> : <input {...props} />}
      {open && (
        <ul role="listbox" aria-label="选择要提到的人" className="absolute top-full left-0 z-20 mt-1 w-full overflow-hidden rounded-md border bg-surface py-1 shadow-float">
          {matches.map((p, i) => (
            <li
              key={p.email}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(p)
              }}
              onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-sm", i === active && "bg-accent")}
            >
              <span className="font-medium">{p.name}</span>
              <span className="truncate text-xs text-muted-foreground">{p.email}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
