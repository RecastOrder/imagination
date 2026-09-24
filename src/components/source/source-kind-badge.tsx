import { Badge } from "@/components/ui/badge"
import { SOURCE_KINDS } from "@/lib/sources/kinds"
import type { SourceKind } from "@/lib/sources/types"

export function SourceKindBadge({ kind }: { kind: SourceKind }) {
  const { label, icon: Icon } = SOURCE_KINDS[kind]
  return (
    <Badge variant="outline">
      <Icon />
      {label}
    </Badge>
  )
}

export function SourceKindIcon({ kind, className }: { kind: SourceKind; className?: string }) {
  const Icon = SOURCE_KINDS[kind].icon
  return <Icon className={className} aria-label={SOURCE_KINDS[kind].label} />
}
