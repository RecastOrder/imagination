/** 服务器启动时运行一次（Next.js 约定）。只在 Node.js 运行时做配置检查 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startupCheck } = await import("./lib/server/startup-check")
    startupCheck()
  }
}
