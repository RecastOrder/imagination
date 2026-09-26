import type { Source } from "@/lib/sources/types"
import { cn } from "@/lib/utils"

/**
 * 出处一行（R154：对外只放有出处的资料）：哪条抓取车道 · 哪一刻取回 · 原网址 / 所在页面。
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
  return (
    <p data-provenance={p.lane} className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      出处：抓取车道 <span className="font-mono">{p.lane}</span>
      {p.at ? <> · 取回于 <span className="tabular-nums">{p.at.slice(0, 10)}</span></> : " · 取回时刻台账没记"}
      {p.page && <> · {link(p.page, "所在页面")}</>}
      {p.url && <> · {link(p.url, p.page ? "文件原址" : "原网址")}</>}
    </p>
  )
}
