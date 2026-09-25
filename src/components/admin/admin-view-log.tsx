import Link from "next/link"
import { ScrollTextIcon } from "lucide-react"

/**
 * 查看记录：管理员打开了谁的哪个个人文件、什么时候。
 * 只列事实，不做评价；同一位管理员 10 分钟内重复打开同一个文件只记一次。
 */
export function AdminViewLog({
  entries,
  nameOf,
}: {
  entries: { id: string; at: number; admin: string; owner: string; itemId: string; itemName: string }[]
  nameOf: (email: string) => string
}) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ScrollTextIcon className="size-5 text-muted-foreground" />
          查看记录
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理员有全部权限，可以打开任何成员的“我的”文件。每次以管理员身份打开时记一笔，只有管理员能看到这里。
          文件本来就开放给自己的，按普通权限打开，不记录。记录永久保留，不能删除。
        </p>
        {entries.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">还没有记录</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl border bg-surface">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">时间</th>
                  <th className="px-4 py-2.5 font-medium">管理员</th>
                  <th className="px-4 py-2.5 font-medium">文件主人</th>
                  <th className="px-4 py-2.5 font-medium">文件</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">
                      {new Date(e.at).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-2.5">{nameOf(e.admin)}</td>
                    <td className="px-4 py-2.5">{nameOf(e.owner)}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/browse?f=${encodeURIComponent(e.itemId)}`} className="hover:text-primary hover:underline">
                        {e.itemName}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
