"use client"

import { useSyncExternalStore } from "react"

/** 断点与 Tailwind 保持一致：md 768 / lg 1024 / xl 1280 / 2xl 1536 */
export const BREAKPOINTS = { md: 768, lg: 1024, xl: 1280, "2xl": 1536 } as const

export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  )
}

export function useMinWidth(bp: keyof typeof BREAKPOINTS, serverValue = true) {
  return useMediaQuery(`(min-width: ${BREAKPOINTS[bp]}px)`, serverValue)
}
