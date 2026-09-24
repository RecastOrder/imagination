import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** 合并 className：后写的 Tailwind 类会覆盖先写的同类属性 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
