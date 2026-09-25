/**
 * 发邮件（Resend）。
 * 配置环境变量后生效：
 *   RESEND_API_KEY  在 resend.com 创建的 API Key
 *   RESEND_FROM     发件人，如 "Imagination <noreply@你的域名>"（域名需先在 Resend 后台验证）
 * 未配置时进入演示模式：不发邮件，只打印到服务器日志。
 */
const API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.RESEND_FROM ?? "Imagination <onboarding@resend.dev>"

export const EMAIL_CONFIGURED = !!API_KEY

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
  if (!API_KEY) {
    console.info(`[email] 演示模式，未真正发送 → ${msg.to}｜${msg.subject}\n${msg.text}`)
    return true
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!r.ok) console.error(`[email] Resend 返回 ${r.status}: ${await r.text()}`)
    return r.ok
  } catch (e) {
    console.error("[email] 发送失败", e)
    return false
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)

/** 邮件模板：纯表格 + 内联样式，兼容国内企业邮箱客户端 */
function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f4f0;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;color:#1f1d1a">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e6e1d8;border-radius:12px">
<tr><td style="padding:28px 32px 8px;font-size:15px;font-weight:600">Imagination</td></tr>
<tr><td style="padding:8px 32px 0;font-size:20px;font-weight:600">${esc(title)}</td></tr>
<tr><td style="padding:16px 32px 28px;font-size:14px;line-height:1.7">${body}</td></tr>
</table>
<p style="font-size:12px;color:#8a847a;margin-top:16px">如果这不是你的操作，请忽略这封邮件。</p>
</td></tr></table></body></html>`
}

export function codeEmail(code: string) {
  return {
    subject: `${code} 是你的 Imagination 登录验证码`,
    text: `你的登录验证码是 ${code}，10 分钟内有效。`,
    html: layout(
      "登录验证码",
      `<p style="margin:0 0 16px">你的验证码是：</p>
<p style="margin:0 0 16px;font-size:32px;letter-spacing:8px;font-weight:700;font-family:Menlo,monospace">${esc(code)}</p>
<p style="margin:0;color:#8a847a">10 分钟内有效，只能使用一次。</p>`,
    ),
  }
}

export function inviteEmail(opts: { inviter: string; link: string; roleLabel: string }) {
  return {
    subject: `${opts.inviter} 邀请你加入 Imagination`,
    text: `${opts.inviter} 邀请你以「${opts.roleLabel}」身份加入 Imagination。打开链接登录：${opts.link}`,
    html: layout(
      "你收到一份邀请",
      `<p style="margin:0 0 16px">${esc(opts.inviter)} 邀请你以「${esc(opts.roleLabel)}」身份加入 Imagination——以知识库为基础的建筑设计工作台。</p>
<p style="margin:0 0 20px"><a href="${esc(opts.link)}" style="display:inline-block;background:#b0512e;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600">打开并登录</a></p>
<p style="margin:0;color:#8a847a">登录无需密码：打开后点“登录”，我们会给这个邮箱发送验证码。</p>`,
    ),
  }
}

export function mentionEmail(opts: { from: string; issue: string; fileName: string; text: string; link: string }) {
  return {
    subject: `${opts.from} 在问题「${opts.issue}」里提到了你`,
    text: `${opts.from} 在「${opts.fileName}」的问题「${opts.issue}」里提到了你：${opts.text}\n打开查看：${opts.link}`,
    html: layout(
      "有人提到了你",
      `<p style="margin:0 0 12px">${esc(opts.from)} 在「${esc(opts.fileName)}」的问题 <strong>${esc(opts.issue)}</strong> 里提到了你：</p>
<p style="margin:0 0 20px;padding:10px 14px;background:#f6f4f0;border-radius:8px">${esc(opts.text)}</p>
<p style="margin:0 0 8px"><a href="${esc(opts.link)}" style="display:inline-block;background:#b0512e;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600">打开查看</a></p>`,
    ),
  }
}
