"use client"

import { Fragment } from "react"

import type { BlockProps } from "./registry"
import { Citation } from "./citation"

export function TextBlock({ block, ctx }: BlockProps<"text">) {
  const paragraphs = block.content.split(/\n{2,}/)
  return (
    <div className="space-y-3 text-[15px] leading-[1.75]">
      {paragraphs.map((p, i) => (
        <p key={i}>
          {p.split(/(\[\d+\])/).map((part, j) => {
            const m = part.match(/^\[(\d+)\]$/)
            const id = m ? block.citations?.[Number(m[1]) - 1] : undefined
            return id ? (
              <Citation key={j} n={Number(m![1])} sourceId={id} active={ctx.peekId === id} onOpen={ctx.openPeek} />
            ) : (
              <Fragment key={j}>{part}</Fragment>
            )
          })}
        </p>
      ))}
    </div>
  )
}
