/** 服务器启动时运行一次（Next.js 约定）。只在 Node.js 运行时做配置检查 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startupCheck } = await import("./lib/server/startup-check")
    startupCheck()
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
