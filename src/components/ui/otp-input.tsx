"use client"

import { useRef } from "react"

import { cn } from "@/lib/utils"

/**
 * 验证码输入框：6 个格子。
 * - 输入一位自动跳到下一格，退格回到上一格
 * - 支持整段粘贴；手机上 autocomplete="one-time-code" 可以直接从短信/邮件填入
 * - 出错时整组变红并轻微抖动（动作提示比只变色更容易被注意到）
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  invalid,
  disabled,
  autoFocus,
  label = "验证码",
}: {
  value: string
  onChange: (v: string) => void
  length?: number
  invalid?: boolean
  disabled?: boolean
  autoFocus?: boolean
  label?: string
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? "")
  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus()

  const setAt = (i: number, d: string) => {
    const arr = digits.slice()
    arr[i] = d
    onChange(arr.join("").slice(0, length))
  }

  return (
    <div role="group" aria-label={label} className={cn("flex gap-2", invalid && "motion-safe:animate-[shake_0.35s_ease-in-out]")}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          value={d}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`${label}第 ${i + 1} 位`}
          aria-invalid={invalid || undefined}
          maxLength={length}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "")
            if (!v) return setAt(i, "")
            if (v.length > 1) {
              // 粘贴或自动填充：从当前格开始铺开
              const merged = (digits.slice(0, i).join("") + v).slice(0, length)
              onChange(merged)
              focus(merged.length)
              return
            }
            setAt(i, v)
            focus(i + 1)
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i]) focus(i - 1)
            if (e.key === "ArrowLeft") focus(i - 1)
            if (e.key === "ArrowRight") focus(i + 1)
          }}
          className={cn(
            "h-12 w-11 rounded-lg border border-input bg-surface text-center font-mono text-xl tabular-nums outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-[3px] focus:ring-ring/25 disabled:opacity-50 sm:w-12",
            invalid && "border-destructive focus:border-destructive focus:ring-destructive/20",
          )}
        />
      ))}
    </div>
  )
}
