# 017 对话接上 Cairn 知识库

## 要解决的问题
对话原来按关键词返回写死的演示回答。要换成 Cairn 现在那套检索 + 回答，同时不假装它已经做到了“严谨模式”承诺的全部。

## 方案

```
浏览器（useCairnChat）── POST /api/chat ──▶ 本平台服务器 ── 本机直连 ──▶ Cairn /api/svc/chat/stream
                           （必须登录）          服务令牌 + “替谁问”          按这个人的可见范围检索
◀──────────── SSE：sources → delta… → done ─────────────────────────────────────┘
```

- `CHAT_BACKEND=cairn` 时用真实回答；本地开发默认仍是演示（`useMockChat`），两者接口相同，界面组件不变。
- Cairn 在回答里用 `[资料标题]` 标出处；前端把它换成 `[1][2]`，按标题或规范编号对到资料上（`src/lib/chat/cairn-adapter.ts`）。
- 对不上资料卡的引用不静默丢掉：回答下方单独列出“另有 N 条引用在资料库里还没有对应的资料卡”。
- 每条回答下方都有一条如实的提示：严谨模式的“数字逐字核对原文”还没有实现；发散模式暂时和严谨模式用同一套回答。

## 用到的设计知识
- **渐进呈现（Progressive disclosure）**：先显示“正在检索…”，再逐段出字，最后补资料与提示 —— 400 ms 内给反馈（Doherty 阈值）。
- **诚实的系统状态**（Nielsen 第 1 条）：做不到的承诺写在回答旁边，而不是藏在文档里。

## 备选方案与取舍
| 方案 | 结论 |
|---|---|
| 浏览器直接调 Cairn | 不用：Cairn 的对话接口只认它自己的登录，而且会把服务令牌暴露给浏览器 |
| 先等 Cairn 做完两种模式再接 | 不用：先把真回答接进来，缺的两件事如实标出 |

## 待你决定
- [ ] 对话是两种模式（严谨 / 发散）还是 spec 102 的三种（规范检索 / 设计检索 / Grasshopper）？（推荐先定这个，再做模式的真实差异）

## 改动位置
`src/app/api/chat/route.ts` · `src/components/chat/use-cairn-chat.ts` · `src/lib/chat/cairn-adapter.ts` · `src/components/chat/chat-view.tsx` · `src/components/blocks/{citation,sources-block,notice-block}.tsx`
