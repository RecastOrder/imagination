"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUpIcon, PaperclipIcon, SquareIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * 输入框（Composer）。状态：空闲 / 输入中 / 生成中（按钮变“停止”）/ 禁用。
 * 对话页、阅读页的右下角助手用的都是它，只是 size 和 context 不同。
 */
export function Composer({
  onSend,
  onStop,
  busy,
  placeholder = "问问规范、找资料，或描述你想看的建筑…",
  size = "lg",
  context,
  autoFocus,
}: {
  onSend: (text: string) => void
  onStop?: () => void
  busy?: boolean
  placeholder?: string
  size?: "md" | "lg"
  /** 输入框上方的上下文标签，如“当前文档：xxx” */
  context?: React.ReactNode
  autoFocus?: boolean
}) {
  const [value, setValue] = useState("")
  const ref = useRef<HTMLTextAreaElement>(null)

  // 自动增高，最多 8 行
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 8 * 24 + 16)}px`
  }, [value])

  const submit = () => {
    if (!value.trim() || busy) return
    onSend(value)
    setValue("")
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className={cn(
        "rounded-(--composer-radius) border border-border-strong bg-surface shadow-float transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/15",
        size === "lg" ? "p-3" : "p-2",
      )}
    >
      {context && <div className="mb-2 flex flex-wrap gap-1.5">{context}</div>}
      <textarea
        ref={ref}
        rows={1}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          // Enter 发送，Shift+Enter 换行；中文输入法选词时不触发
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            submit()
          }
        }}
        placeholder={placeholder}
        aria-label="输入问题"
        className={cn(
          "block w-full resize-none bg-transparent px-1.5 leading-6 outline-none placeholder:text-muted-foreground",
          size === "lg" ? "min-h-12 text-[15px]" : "min-h-8 text-sm",
        )}
      />
      <div className="mt-1 flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="添加资料" title="添加资料（演示）">
          <PaperclipIcon />
        </Button>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">Shift + Enter 换行</span>
        {busy ? (
          <Button type="button" size="icon-sm" variant="secondary" onClick={onStop} aria-label="停止生成">
            <SquareIcon className="size-3 fill-current" />
          </Button>
        ) : (
          <Button type="submit" size="icon-sm" disabled={!value.trim()} aria-label="发送" className="rounded-full">
            <ArrowUpIcon />
          </Button>
        )}
      </div>
    </form>
  )
}
