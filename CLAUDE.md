@AGENTS.md

# Imagination 项目约定

面向建筑设计师、以知识库为基础的工作平台。技术栈：Next.js（App Router）+ Tailwind v4 + shadcn/ui 写法（Radix）+ lucide 图标。

## 设计系统规则（必须遵守）

- 分层：L0 令牌（`src/app/globals.css`）→ L1 基础组件（`src/components/ui`）→ L2 业务组件（`src/components/{source,chat,blocks,library,reader}`）→ L3 骨架（`src/components/shell`）→ L4 页面（`src/app`）。下层不能依赖上层。
- 页面和组件里**禁止写原始色值**（#hex、oklch()、`text-[#…]`、Tailwind 调色板色如 `bg-stone-200`），只用语义令牌（`bg-surface`、`text-muted-foreground`、`bg-primary` 等）。
- 强调色（primary，陶土色）只用于三处：主操作、当前位置/选中、焦点/引用。
- 组件外观变化通过 `variant` / `size`（cva）表达，页面不临时覆盖组件样式。
- 新的 AI 结果类型 = 在 `src/lib/chat/types.ts` 加一个 Block 类型 + 在 `src/components/blocks/registry.tsx` 注册一个组件。
- 预览面板状态放 URL（`?peek=资料id`），见 `src/hooks/use-peek.ts`。
- 每个新组件都要考虑：默认 / 悬停 / 选中 / 加载 / 空 / 错误 / 禁用 / 访客（无权限），并在 `/design` 样张页补上。
- 响应式断点：<768 手机（抽屉）/ 768–1024 平板 / ≥1024 桌面（分栏）。

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
