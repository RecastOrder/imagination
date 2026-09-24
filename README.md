# Imagination

面向建筑设计师、以知识库为基础的工作平台（开发中）。

```bash
npm install
npm run dev        # http://localhost:3000
```

| 路由 | 说明 |
|---|---|
| `/` | 访客首页：简介、使用方式、受限资料预览、登录入口 |
| `/chat` | 对话：严谨 / 发散两种模式（记住个人偏好），引用在右侧预览 |
| `/library` | 资料库：使用场景 + 按类型 / 地区 / 年份检索，可保存自己的视图 |
| `/library/[id]` | 阅读模式：文本 / 原版切换、选中文字高亮 / 摘录 / 问 AI、右下角 AI 助手 |
| `/notebook` | 笔记本：按项目收集摘录、AI 回答、备忘；可只在本笔记本范围内提问 |
| `/files` | 我的文件：拖拽上传（分块 SHA-256 校验、秒传、断点续传）、百度网盘导入 |
| `/admin/members` | 成员与权限：角色模板 + 个人调整、资料范围、配额 |
| `/design` | 设计系统活样张 |

- 设计规则与协作约定：[`CLAUDE.md`](./CLAUDE.md)
- 开发流程：[`docs/dev-process.md`](./docs/dev-process.md)
- 设计决策日志：[`docs/design-journal/`](./docs/design-journal/)

> 当前使用演示数据（`src/lib/sources/mock.ts`），资料正文均为占位文本；笔记、文件、偏好暂存在浏览器 localStorage。
