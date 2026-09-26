import type { Source } from "@/lib/sources/types"
import { cn } from "@/lib/utils"

/**
 * 出处一行（R154：对外只放有出处的资料）：发布方与档位 · 哪一刻取回 · 原网址 / 所在页面 ·（抓取车道）。
 * 车道名是标识符，原样显示不截断（R113 ⑧）；时刻台账没记就明写没记，不猜。只有站内编号、没有网址的资料根本进不来（R154）。
 */
export function ProvenanceLine({ source, className }: { source: Pick<Source, "provenance">; className?: string }) {
  const p = source.provenance
  if (!p) return null
  const link = (href: string, label: string) => (
    <a href={href} target="_blank" rel="noreferrer" className="break-all underline underline-offset-2 hover:text-foreground">
      {label}
    </a>
  )
  if (p.unverified)
    return (
      <p data-provenance={p.lane} data-unverified className={cn("text-xs leading-relaxed text-warning", className)}>
        {p.unverified} · 文件在 hold 的 <span className="font-mono">{p.lane}</span>
      </p>
    )
  // 先说「谁发的、是哪一档」，再说时间与网址；抓取车道名是我们内部的标识，放最后当小字（owner 2026-09-26「出版社就标注出版社，住建部就标注住建部」）
  return (
    <p data-provenance={p.lane} data-issuer-kind={p.issuerKind} className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      出处：{p.issuer ? <span className="text-foreground">{p.issuer}</span> : "来源名未核"}
      {p.issuerKind && (
        <span className="ml-1 rounded-sm border px-1 py-px text-[11px] whitespace-nowrap">{p.issuerKind}</span>
      )}
      {p.at ? <> · 取回于 <span className="tabular-nums">{p.at.slice(0, 10)}</span></> : " · 取回时刻台账没记"}
      {p.page && <> · {link(p.page, "所在页面")}</>}
      {p.url && <> · {link(p.url, p.page ? "文件原址" : "原网址")}</>}
      <span className="ml-1 font-mono text-[10px] opacity-60">（车道 {p.lane}）</span>
    </p>
  )
}
