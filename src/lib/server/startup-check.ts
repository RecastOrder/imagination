/**
 * 服务器启动时检查一次配置：正式环境缺少关键设置就直接拒绝启动，
 * 而不是等到有人登录时才出错。配置说明见 deploy/.env.example、docs/deploy.md。
 */
export function startupCheck() {
  if (process.env.NODE_ENV !== "production") return
  if ((process.env.AUTH_SECRET ?? "").length < 32) {
    console.error("\n[启动检查] 缺少 AUTH_SECRET（至少 32 个字符）。生成：openssl rand -base64 48，填到 deploy/.env\n")
    process.exit(1)
  }
  if (!process.env.RESEND_API_KEY) {
    console.warn("[启动检查] 没有配置 RESEND_API_KEY：验证码邮件不会真正发出，只会写在服务器日志里。正式使用前请配置。")
  }
  if (!process.env.APP_URL) console.warn("[启动检查] 没有配置 APP_URL：邮件里的链接会用请求的地址。")
}
