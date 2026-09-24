"use client"

import type { ComponentType } from "react"

import type { ChatMode } from "@/lib/chat/modes"
import type { Block, BlockType } from "@/lib/chat/types"
import { FiltersBlock } from "./filters-block"
import { IdeaBlock } from "./idea-block"
import { ImagesBlock } from "./images-block"
import { NoticeBlock } from "./notice-block"
import { SourcesBlock } from "./sources-block"
import { TextBlock } from "./text-block"

/** 渲染块时需要的上下文：当前预览的是哪份资料、怎么打开预览 */
export interface BlockContext {
  peekId: string | null
  openPeek: (id: string, sec?: string) => void
  /** 切换对话模式并重问上一个问题（提示块里的按钮用） */
  onSwitchMode?: (mode: ChatMode) => void
}

export type BlockProps<T extends BlockType> = {
  block: Extract<Block, { type: T }>
  ctx: BlockContext
}

/** 注册表：块类型 → 组件。新增块类型只需在这里加一行 */
const REGISTRY: { [T in BlockType]: ComponentType<BlockProps<T>> } = {
  text: TextBlock,
  sources: SourcesBlock,
  images: ImagesBlock,
  filters: FiltersBlock,
  idea: IdeaBlock,
  notice: NoticeBlock,
}

export function BlockRenderer({ block, ctx }: { block: Block; ctx: BlockContext }) {
  const Component = REGISTRY[block.type] as ComponentType<{ block: Block; ctx: BlockContext }>
  return <Component block={block} ctx={ctx} />
}
