import { Badge } from "@/components/ui/badge"
import { FORMATS, SUPPORT_LABEL, type FormatGroup } from "@/lib/drive/formats"

const GROUP_ORDER: FormatGroup[] = ["文档", "表格", "图片", "图纸", "三维", "压缩包", "音视频"]

/** 文件格式支持矩阵：直接读 lib/drive/formats.ts，和查看器永远一致 */
export function FormatMatrix() {
  return (
    <div className="overflow-x-auto rounded-xl border bg-surface">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">类别</th>
            <th className="px-4 py-2.5 font-medium">格式</th>
            <th className="px-4 py-2.5 font-medium">预览</th>
          </tr>
        </thead>
        <tbody>
          {GROUP_ORDER.map((g) =>
            Object.entries(FORMATS)
              .filter(([, f]) => f.group === g)
              .map(([ext, f], i, arr) => (
                <tr key={ext} className="border-b last:border-0">
                  {i === 0 && (
                    <td rowSpan={arr.length} className="border-r px-4 py-2 align-top font-medium">
                      {g}
                    </td>
                  )}
                  <td className="px-4 py-2">
                    {f.label} <span className="font-mono text-xs text-muted-foreground">.{ext}</span>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={f.support === "full" ? "neutral" : "outline"}>{SUPPORT_LABEL[f.support]}</Badge>
                  </td>
                </tr>
              )),
          )}
        </tbody>
      </table>
    </div>
  )
}
