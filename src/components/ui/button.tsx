import * as React from "react"
import { Slot } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * 按钮的所有“长相”都收在 variant / size 里。
 * 页面只写 <Button variant="primary">，不在外面临时改颜色——
 * 以后要调按钮风格，只改这一个文件。
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,border-color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer",
  {
    variants: {
      variant: {
        /** 主操作：一屏最多一个 */
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        /** 次要操作 */
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        /** 带边框的中性操作 */
        outline:
          "border border-border-strong bg-surface hover:bg-accent hover:text-accent-foreground",
        /** 工具栏、列表里的轻量操作 */
        ghost: "hover:bg-accent hover:text-accent-foreground",
        /** 破坏性操作：删除等 */
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 gap-1.5 px-3 text-[13px]",
        md: "h-9 px-4",
        lg: "h-11 rounded-lg px-6 text-[15px]",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
