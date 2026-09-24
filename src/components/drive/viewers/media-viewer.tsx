"use client"

import type { ViewerProps } from "./types"

export function VideoViewer({ src }: ViewerProps) {
  return (
    <div className="flex h-full items-center justify-center bg-surface-sunken p-6">
      <video src={src} controls className="max-h-full max-w-full rounded-lg shadow-float" />
    </div>
  )
}

export function AudioViewer({ src }: ViewerProps) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <audio src={src} controls className="w-full max-w-md" />
    </div>
  )
}
