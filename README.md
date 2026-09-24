# Imagination

面向建筑设计师、以知识库为基础的工作平台（开发中）。

```bash
npm install
npm run dev        # http://localhost:3000
```

| 路由 | 说明 |
|---|---|
| `/` | 访客首页：简介、使用方式、受限资料预览、登录入口 |
| `/chat` | 对话：回答中的引用在右侧预览 |
| `/library` | 资料库：按类型 / 地区 / 年份检索 |
| `/library/[id]` | 阅读模式：目录、字号、右下角 AI 助手 |
| `/design` | 设计系统活样张 |

- 设计规则与协作约定：[`CLAUDE.md`](./CLAUDE.md)
- 开发流程：[`docs/dev-process.md`](./docs/dev-process.md)
- 设计决策日志：[`docs/design-journal/`](./docs/design-journal/)

> 当前使用演示数据（`src/lib/sources/mock.ts`），资料正文均为占位文本。
