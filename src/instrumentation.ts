/** 服务器启动时运行一次（Next.js 约定）。只在 Node.js 运行时做配置检查 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startupCheck } = await import("./lib/server/startup-check")
    startupCheck()
    // 登录名单来自 Cairn 时：启动先取一次，之后每分钟刷新（失败保留上一份，见 cairn-roster.ts）
    const roster = await import("./lib/server/cairn-roster")
    if (roster.rosterEnabled()) {
      const tick = async () => {
        const r = await roster.refreshRoster()
        if (!r.ok) console.error("[Cairn 名单] 刷新失败，沿用上一份：", r.error)
      }
      await tick()
      setInterval(tick, roster.ROSTER_REFRESH_MS).unref?.()
    }
    // 资料列表第一次建要扫全部资料卡（几千份，十几秒）；启动后在后台先建好，别让第一个打开资料库的人等
    const { sourcesRepo } = await import("./lib/server/sources-repo")
    setTimeout(() => {
      try {
        sourcesRepo().list()
      } catch (e) {
        console.error("[资料仓库] 预热失败：", e)
      }
    }, 0)
  }
}
