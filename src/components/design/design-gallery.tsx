"use client"

import { useState } from "react"
import { ArrowRightIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Skeleton } from "@/components/ui/skeleton"
import { Citation } from "@/components/blocks/citation"
import { FiltersBlock } from "@/components/blocks/filters-block"
import { Composer } from "@/components/chat/composer"
import { SourceCard } from "@/components/source/source-card"
import { getSource } from "@/lib/sources/mock"

/**
 * 设计系统样张（活的规范）。
 * 这里展示的就是产品里真正在用的令牌和组件——改了令牌，这一页和整个产品一起变。
 * 以后可以迁移到 Storybook，但对早期项目，一页“活样张”更轻便。
 */
export function DesignGallery() {
  const [active, setActive] = useState<string | null>("gb50352-2019")
  const s1 = getSource("gb50352-2019")!
  const s2 = getSource("report-church-of-light")!

  return (
    <div className="space-y-16">
      <Section
        id="layers"
        title="1. 令牌的三层结构"
        note="改品牌色只改第 1 层的一个值；做暗色模式只重新映射第 2 层；组件永远只认第 2 层的名字。"
      >
        <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <LayerBox title="第 1 层 · 原始值" sub="这是什么颜色" rows={["--stone-50", "--stone-900", "--terracotta-600"]} />
          <Arrow />
          <LayerBox title="第 2 层 · 语义" sub="用在哪里" rows={["--background", "--foreground", "--primary"]} highlight />
          <Arrow />
          <LayerBox title="组件" sub="只引用语义" rows={["bg-background", "text-foreground", "bg-primary"]} />
        </div>
      </Section>

      <Section id="color" title="2. 颜色：90% 中性 + 1 个强调色" note="切换左下角的深浅色，看同一个语义名字如何映射到不同的原始值。">
        <h3 className="mb-3 text-sm font-medium">中性色（界面主体）</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Swatch token="background" cls="bg-background" />
          <Swatch token="surface" cls="bg-surface" />
          <Swatch token="surface-sunken" cls="bg-surface-sunken" />
          <Swatch token="secondary" cls="bg-secondary" />
          <Swatch token="border" cls="bg-border" />
          <Swatch token="border-strong" cls="bg-border-strong" />
          <Swatch token="muted-foreground" cls="bg-muted-foreground" />
          <Swatch token="foreground" cls="bg-foreground" />
        </div>
        <h3 className="mt-8 mb-3 text-sm font-medium">强调色：只用在三个地方</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Rule title="① 主操作" desc="一屏最多一个">
            <Button size="sm">登录并开始</Button>
          </Rule>
          <Rule title="② 当前位置 / 选中" desc="浅底 + 强调色图标">
            <span className="inline-flex h-8 items-center gap-2 rounded-md bg-primary-subtle px-2.5 text-sm text-primary-subtle-foreground">
              <span className="size-2 rounded-full bg-primary" />
              资料库
            </span>
          </Rule>
          <Rule title="③ 焦点 / 引用" desc="键盘焦点环、引用高亮">
            <Input placeholder="聚焦时出现强调色的环" className="border-ring ring-[3px] ring-ring/25" />
          </Rule>
        </div>
        <h3 className="mt-8 mb-3 text-sm font-medium">状态色：只在表达状态时出现</h3>
        <div className="flex flex-wrap gap-3">
          <Swatch token="success" cls="bg-success" small />
          <Swatch token="warning" cls="bg-warning" small />
          <Swatch token="destructive" cls="bg-destructive" small />
        </div>
      </Section>

      <Section id="type" title="3. 字体与字号阶梯" note="界面用无衬线（清晰、紧凑）；长文阅读用衬线宋体（有笔画粗细变化，长时间阅读更不累）。">
        <div className="space-y-3">
          {[
            ["32 / 标题", "text-[32px] font-semibold tracking-tight"],
            ["24 / 页面标题", "text-2xl font-semibold"],
            ["18 / 小节标题", "text-lg font-semibold"],
            ["15 / 正文", "text-[15px]"],
            ["14 / 界面文字", "text-sm"],
            ["12 / 辅助信息", "text-xs text-muted-foreground"],
          ].map(([label, cls]) => (
            <div key={label} className="flex items-baseline gap-6 border-b pb-3">
              <span className="w-28 shrink-0 font-mono text-xs text-muted-foreground">{label}</span>
              <span className={cls}>建筑的永恒之道</span>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-surface p-5">
            <p className="text-xs text-muted-foreground">font-sans · 界面</p>
            <p className="mt-2 text-[15px] leading-relaxed">住宅日照需同时对照国家标准和地方标准。</p>
          </div>
          <div className="rounded-lg border bg-surface p-5">
            <p className="text-xs text-muted-foreground">font-serif · 阅读</p>
            <p className="mt-2 font-serif text-[17px] leading-[1.9]">住宅日照需同时对照国家标准和地方标准。</p>
          </div>
        </div>
      </Section>

      <Section id="space" title="4. 间距与圆角" note="间距只用 4 的倍数；圆角全部从一个 --radius 推导，改它就能整体变“方”或变“圆”。">
        <div className="flex flex-wrap items-end gap-4">
          {[1, 2, 3, 4, 6, 8, 12, 16].map((n) => (
            <div key={n} className="text-center">
              <div className="bg-primary/70" style={{ width: n * 4, height: n * 4 }} />
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">{n * 4}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-4">
          {[
            ["sm", "rounded-sm"],
            ["md", "rounded-md"],
            ["lg", "rounded-lg"],
            ["xl", "rounded-xl"],
            ["2xl", "rounded-2xl"],
          ].map(([n, cls]) => (
            <div key={n} className="text-center">
              <div className={`size-16 border-2 border-border-strong bg-surface ${cls}`} />
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">{n}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="button" title="5. 基础组件：按钮的变体" note="页面里只选 variant，不临时改颜色。改按钮风格 = 只改 button.tsx。">
        <div className="flex flex-wrap items-center gap-3">
          <Button>主操作</Button>
          <Button variant="secondary">次要</Button>
          <Button variant="outline">描边</Button>
          <Button variant="ghost">幽灵</Button>
          <Button variant="link">链接</Button>
          <Button variant="destructive">
            <Trash2Icon />
            删除
          </Button>
          <Button disabled>禁用</Button>
          <Button size="icon" variant="outline" aria-label="添加">
            <PlusIcon />
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge>标签</Badge>
          <Badge variant="outline">描边标签</Badge>
          <Badge variant="primary">生效的条件</Badge>
          <Kbd>⌘K</Kbd>
        </div>
      </Section>

      <Section
        id="business"
        title="6. 业务组件与状态"
        note="同一个组件要把每种状态都画出来：默认、选中、加载、空、错误。这张表就是“状态矩阵”。"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <State label="资料卡片 · 默认">
            <SourceCard source={s2} onOpen={setActive} active={active === s2.id} />
          </State>
          <State label="资料卡片 · 选中（右侧正在预览）">
            <SourceCard source={s1} onOpen={setActive} active={active === s1.id} />
          </State>
          <State label="资料卡片 · 紧凑（对话里的引用）">
            <SourceCard source={s1} index={1} density="compact" onOpen={setActive} />
          </State>
          <State label="资料卡片 · 加载中（骨架屏）">
            <div className="flex gap-3 rounded-lg border p-4">
              <Skeleton className="size-10" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          </State>
          <State label="引用编号 · 默认 / 当前">
            <p className="text-[15px]">
              国家标准给出底线要求
              <Citation n={1} sourceId={s1.id} onOpen={setActive} />
              <Citation n={2} sourceId={s2.id} active onOpen={setActive} />
              。
            </p>
          </State>
          <State label="检索条件（对话 → 资料库的桥）">
            <FiltersBlock block={{ type: "filters", filters: { q: "日照", kinds: ["standard"], regions: ["上海"] }, total: 3 }} ctx={{ peekId: null, openPeek: () => {} }} />
          </State>
          <State label="输入框 · 空闲">
            <Composer onSend={() => {}} size="md" />
          </State>
          <State label="输入框 · 生成中（可停止）">
            <Composer onSend={() => {}} size="md" busy />
          </State>
        </div>
      </Section>

      <p className="flex items-center gap-1 text-sm text-muted-foreground">
        设计决策记录见仓库 <code className="font-mono">docs/design-journal/</code>
        <ArrowRightIcon className="size-3.5" />
      </p>
    </div>
  )
}

function Section({ id, title, note, children }: { id: string; title: string; note: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1.5 mb-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">{note}</p>
      {children}
    </section>
  )
}

function LayerBox({ title, sub, rows, highlight }: { title: string; sub: string; rows: string[]; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-primary/60 bg-primary-subtle/40" : "bg-surface"}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
      <ul className="mt-3 space-y-1.5 font-mono text-xs">
        {rows.map((r) => (
          <li key={r} className="rounded bg-surface-sunken px-2 py-1">
            {r}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Arrow() {
  return (
    <div className="flex items-center justify-center text-muted-foreground" aria-hidden>
      <ArrowRightIcon className="size-5 rotate-90 md:rotate-0" />
    </div>
  )
}

function Swatch({ token, cls, small }: { token: string; cls: string; small?: boolean }) {
  return (
    <div className={small ? "w-28" : ""}>
      <div className={`h-14 rounded-lg border ${cls}`} />
      <p className="mt-1.5 font-mono text-xs">{token}</p>
    </div>
  )
}

function Rule({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-surface p-4">
      <div className="flex h-12 items-center">{children}</div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  )
}

function State({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-mono text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}
