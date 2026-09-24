"use client"

import { Fragment, useEffect, useState } from "react"

import { extOf } from "@/lib/drive/formats"
import type { ViewerProps } from "./types"

/** 文本类：Markdown 排版显示，CSV 显示为表格，其余按原样等宽显示 */
export function TextViewer({ name, blob }: ViewerProps) {
  const [text, setText] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    blob.text().then((t) => alive && setText(t.replace(/^﻿/, "")))
    return () => {
      alive = false
    }
  }, [blob])
  if (text === null) return null
  const ext = extOf(name)
  if (ext === "md") return <Markdown text={text} />
  if (ext === "csv") return <CsvTable text={text} />
  return (
    <pre className="mx-auto max-w-4xl px-6 py-8 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
      {ext === "json" ? safeJson(text) : text}
    </pre>
  )
}

function safeJson(t: string) {
  try {
    return JSON.stringify(JSON.parse(t), null, 2)
  } catch {
    return t
  }
}

function CsvTable({ text }: { text: string }) {
  const rows = text.trim().split(/\r?\n/).map((l) => l.split(","))
  const [head, ...body] = rows
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="overflow-x-auto rounded-lg border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-surface-sunken">
              {head.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-2 tabular-nums">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">共 {body.length} 行 · 第二期将支持 Excel（.xlsx）的同样表格视图</p>
    </div>
  )
}

/** 极简 Markdown：标题、段落、列表、引用、表格、行内粗体 / 代码。够看文档用，不追求完整 */
function Markdown({ text }: { text: string }) {
  const lines = text.split(/\r?\n/)
  const out: React.ReactNode[] = []
  let i = 0
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((p, k) =>
      p.startsWith("**") ? (
        <strong key={k}>{p.slice(2, -2)}</strong>
      ) : p.startsWith("`") ? (
        <code key={k} className="rounded bg-surface-sunken px-1 font-mono text-[0.9em]">
          {p.slice(1, -1)}
        </code>
      ) : (
        <Fragment key={k}>{p}</Fragment>
      ),
    )
  while (i < lines.length) {
    const l = lines[i]
    const h = l.match(/^(#{1,4})\s+(.*)/)
    if (h) {
      const size = ["text-2xl", "text-xl", "text-lg", "text-base"][h[1].length - 1]
      out.push(
        <p key={i} role="heading" aria-level={h[1].length} className={`${size} mt-8 mb-3 font-semibold first:mt-0`}>
          {inline(h[2])}
        </p>,
      )
      i++
    } else if (l.startsWith("|")) {
      const tbl: string[][] = []
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!/^\|[\s:|-]+\|$/.test(lines[i])) tbl.push(lines[i].slice(1, -1).split("|").map((c) => c.trim()))
        i++
      }
      out.push(
        <div key={i} className="my-4 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <tbody>
              {tbl.map((r, ri) => (
                <tr key={ri} className={ri === 0 ? "border-b bg-surface-sunken font-medium" : "border-b last:border-0"}>
                  {r.map((c, ci) => (
                    <td key={ci} className="px-3 py-2">
                      {inline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
    } else if (/^\s*([-*]|\d+\.)\s/.test(l)) {
      const ordered = /^\s*\d+\./.test(l)
      const items: string[] = []
      while (i < lines.length && /^\s*([-*]|\d+\.)\s/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s/, ""))
      const L = ordered ? "ol" : "ul"
      out.push(
        <L key={i} className={`my-3 space-y-1 pl-6 ${ordered ? "list-decimal" : "list-disc"}`}>
          {items.map((it, k) => (
            <li key={k}>{inline(it)}</li>
          ))}
        </L>,
      )
    } else if (l.startsWith(">")) {
      out.push(
        <blockquote key={i} className="my-3 border-l-2 border-border-strong pl-3 text-muted-foreground">
          {inline(l.replace(/^>\s?/, ""))}
        </blockquote>,
      )
      i++
    } else if (l.trim()) {
      out.push(
        <p key={i} className="my-3">
          {inline(l)}
        </p>,
      )
      i++
    } else i++
  }
  return <article className="mx-auto max-w-(--reader-measure) px-6 py-10 font-serif text-[16px] leading-[1.85]">{out}</article>
}
