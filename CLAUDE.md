@AGENTS.md

# Imagination 项目约定

面向建筑设计师、以知识库为基础的工作平台。技术栈：Next.js（App Router）+ Tailwind v4 + shadcn/ui 写法（Radix）+ lucide 图标。

## 设计系统规则（必须遵守）

- 分层：L0 令牌（`src/app/globals.css`）→ L1 基础组件（`src/components/ui`）→ L2 业务组件（`src/components/{source,chat,blocks,library,reader,notebook,files,admin,account,drive,projects,share}`）→ L3 骨架（`src/components/shell`）→ L4 页面（`src/app`）。下层不能依赖上层。
- 页面和组件里**禁止写原始色值**（#hex、oklch()、`text-[#…]`、Tailwind 调色板色如 `bg-stone-200`），只用语义令牌（`bg-surface`、`text-muted-foreground`、`bg-primary` 等）。
- 强调色（primary，陶土色）只用于三处：主操作、当前位置/选中、焦点/引用。
- 组件外观变化通过 `variant` / `size`（cva）表达，页面不临时覆盖组件样式。
- 新的 AI 结果类型 = 在 `src/lib/chat/types.ts` 加一个 Block 类型 + 在 `src/components/blocks/registry.tsx` 注册一个组件。
- 预览面板状态放 URL（`?peek=资料id`），见 `src/hooks/use-peek.ts`。
- 每个新组件都要考虑：默认 / 悬停 / 选中 / 加载 / 空 / 错误 / 禁用 / 访客（无权限），并在 `/design` 样张页补上。
- 响应式断点：<768 手机（抽屉）/ 768–1024 平板 / ≥1024 桌面（分栏）。
- “手机 / 桌面显示哪套布局”优先用 CSS 断点（`hidden md:flex`），不要只靠 JS 判断——否则服务端首屏会先闪一下错误布局。
- 只有真正依赖网址参数的页面才包 `<Suspense>`（配 `PageSkeleton`），不要在外壳层读网址参数，否则整个应用区首屏空白。
- 资料的权威等级（`src/lib/sources/kinds.ts`）：1 规范规章 · 2 图集 · 3 期刊论文 · 4 案例 · 5 个人笔记。严谨模式只引用 1–2。
- 服务端数据一律存数据库：`collection()`（`src/lib/server/db.ts`，SQLite 文件 `.data/imagination.db`，以后可换 PostgreSQL）；不要再用内存 Map 存业务数据。项目成员需要共享的数据必须走服务端接口。只属于个人、暂未迁移的（笔记本、上传记录）仍在 `src/lib/local-store.ts`（localStorage）。备份：`npm run db:backup`。
- 登录：邮箱验证码 + **邀请制**（只有 `src/lib/server/members.ts` 名单里的工作邮箱能登录，拒绝个人邮箱）。会话存在服务器、Cookie 只放签名的会话编号（`src/lib/server/session.ts`），30 天有效，**每账号 1 台电脑 + 1 台手机**，同类设备新登录挤掉旧的。`src/proxy.ts` 拦截未登录访问；**每个接口仍须自己调用 `getCurrentUser()` 校验**。
- 页面权限：页面开头用 `requireFeature()`（`src/lib/server/guard.ts`），没有权限返回 `<NoAccess />`；侧栏用 `useAccount().features` 隐藏无权限入口。
- 账户级偏好（如对话模式）存服务端 `src/lib/server/prefs.ts`，前端通过 `useAccount()` 读写；不要再用 localStorage 存账户偏好。
- `src/lib/server/*` 只能在服务端使用（接口、服务端组件、proxy）。
- 文件浏览：新增可预览格式 = 在 `src/lib/drive/formats.ts` 登记 + 在 `src/components/drive/viewer-host.tsx` 注册查看器；大体积库（PDF.js、three.js）用 `next/dynamic` 按需加载。PDF.js 必须用 `pdfjs-dist/legacy/build/pdf.mjs`（兼容旧浏览器）。浏览器端资源由 `scripts/copy-vendor.mjs` 复制到 `public/vendor`（不提交）。
- 文件浏览分三个空间（`src/lib/drive/sample-tree.ts`）：公共 / 项目 / 我的；能看到哪些项目由服务端 `projectsFor()` 决定。
- Office 预览：浏览器把文件内容 POST 到 `/api/preview/office`，服务器用 LibreOffice 转 PDF（`src/lib/server/office-convert.ts`，按内容哈希缓存在 `.cache/`），前端复用 PDF 查看器。
- 标注与测量：`useAnnotator()`（`src/components/drive/annotate/annotator.tsx`）可装到任意分页查看器上；坐标用页面单位（PDF 点 / 图片像素），比例 = 每单位毫米数。批注和测量用 `--markup` 颜色，不要用强调色。个人标注存服务器、跟着账号走（`src/lib/server/annotations.ts`，按“人 + 文件”），只有自己看得到；要给别人看 = 发起“问题”（`src/lib/server/issues.ts`，按文件权限 `fileAccess()`：能看就能回复，能编辑才能发起 / 关闭），问题用虚线 + “#编号”与个人标注区分。通知（已定）：**只通知被 @ 的人**（`src/lib/server/notifications.ts`：站内铃铛 + Resend 邮件），只能 @ 能看这个文件的人（`checkMentions()`）。
- 邮件：`src/lib/server/email.ts`（Resend）；邮件 HTML 只能用内联样式和具体色值（邮件客户端不支持 CSS 变量），这是“禁止原始色值”的唯一例外。
- 同一个查看器不要在桌面 / 手机两套布局里各渲染一份（会重复加载、重复绑定快捷键）；只在浏览器端渲染的页面可以用 `useMinWidth` 选布局。
- 文件：同名不同内容自动递增版本（`resolveVersion`，`src/lib/files/store.ts`），同名同内容不重复保存；历史版本永久保留。

## 产品定位（已定）

- 平台是**辅助工具**：不做规范审查、不当审核方。界面措辞要体现“供参考，结论由本人确认”；机械核对（数字比较）可以做，但必须写明不代替审查。
- 规范被替代时必须标出，并列出变更内容和影响范围（`src/lib/projects/changes.ts`）。
- 项目：位置细到区，按位置自动匹配三级要求（`src/lib/projects/regional.ts`）；权限判断在 `src/lib/server/projects.ts`。新建项目 = 功能权限 `project_create`（管理员自带，其他人由管理员单独打开），负责人默认发起人。项目**不能删除，只能归档**（`archivedAt`，只读保留、可恢复；归档后 `canEditContent` 为假）。规划条件：手动录入 + PDF 识别（`src/lib/projects/extract-conditions.ts`，只产出带原文片段的候选，必须本人确认后才保存）。
- 权限（已定）：管理员全部权限；项目角色三档 负责人 / 可编辑 / 仅浏览（`MemberRole`）——“编辑内容”（`canEditContent`）与“管理项目和成员权限”（`canManage`）分开校验。个人文件用同一套档位（`src/lib/access.ts`：view / edit）开放给同事——**只在平台内部**，不复制、不发送、没有外部链接（`src/lib/server/shares.ts`），主人或管理员可以设置，开放文件夹覆盖其中所有文件。管理员能看全部成员的“我的”文件（含已停用的人），以管理员身份打开时记入查看记录（`src/lib/server/audit.ts`，`/admin/audit`，只有管理员能看，永久保留、不能删除）。离职 = 管理员停用账号，所有访问自动失效。仅浏览时查看器传 `readOnly`：可以测量、校准，不能标记、框选。界面用“权限 / 谁可以访问”，不要用“分享链接”之类会让人以为文件被发出去的说法。权限下拉统一用 `src/components/share/access-menu.tsx`。

## 学习陪伴模式（用户希望边做边学）

项目负责人正在学习 UI 设计，偏好**可视化**的解释。每次开发或修改一个 UI 模块时：

1. 在回复里附一段简短的**「设计讲解」**：
   - 用了什么模式（名字 + 哪些知名产品在用）
   - 为什么这样做：对应哪条原则（Laws of UX / Refactoring UI / HIG / Material / WCAG）
   - 考虑过的备选方案及取舍
   - **需要负责人做的判断**：以 2–3 个选项的形式列出，并给出推荐
2. 能用图说明的，优先用图：ASCII 布局草图、截图（Playwright，Chromium 在 `/opt/pw-browsers/chromium`），或可视化页面。
3. 在 `docs/design-journal/` 新增一篇编号记录（模板见该目录 README），沉淀决策与术语。
4. 讲解要短，术语第一次出现时用一句话解释。

## 常用命令

- `npm run dev`：开发服务器
- `npm run lint` / `npx tsc --noEmit` / `npm run build`：提交前检查
