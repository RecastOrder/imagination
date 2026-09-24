# Imagination

面向建筑设计师、以知识库为基础的工作平台（开发中）。

```bash
npm install        # 安装后会自动把 PDF.js、rhino3dm 的浏览器资源复制到 public/vendor
npm run dev        # http://localhost:3000
```

环境变量（可选）：

| 变量 | 说明 |
|---|---|
| `AUTH_SECRET` | 登录 Cookie 的签名密钥，生产环境必须设置为随机长字符串 |
| `AUTH_DEMO=off` | 关闭“验证码显示在页面上”的演示模式（接入邮件服务后） |

| 路由 | 说明 |
|---|---|
| `/` | 访客首页：简介、使用方式、受限资料预览、登录入口 |
| `/login` | 邮箱验证码登录，邀请制（演示账号：`zhang.ming@studio.cn` 管理员、`li.na@studio.cn` 标准成员；验证码直接显示在页面上） |
| `/settings` | 账户设置：默认对话模式（跟账户走）、已登录的设备 |
| `/chat` | 对话：严谨 / 发散两种模式（记住个人偏好），引用在右侧预览 |
| `/library` | 资料库：使用场景 + 按类型 / 地区 / 年份检索，可保存自己的视图 |
| `/library/[id]` | 阅读模式：文本 / 原版切换、选中文字高亮 / 摘录 / 问 AI、右下角 AI 助手 |
| `/browse` | 文件浏览：左侧目录树（可拖宽 / 收起）+ 中间查看器；PDF、图片、Markdown、CSV、Rhino 3dm、STL、ZIP 可直接打开 |
| `/notebook` | 笔记本：按项目收集摘录、AI 回答、备忘；可只在本笔记本范围内提问 |
| `/files` | 我的文件：拖拽上传（分块 SHA-256 校验、秒传、断点续传）、同名自动加版本号、百度网盘导入 |
| `/admin/members` | 成员与权限（仅管理员）：邀请工作邮箱、角色模板 + 个人调整、停用账号 |
| `/design` | 设计系统活样张 |

- 设计规则与协作约定：[`CLAUDE.md`](./CLAUDE.md)
- 路线图（整体步骤、当前进度、需求池）：[`docs/roadmap.md`](./docs/roadmap.md)
- 开发流程：[`docs/dev-process.md`](./docs/dev-process.md)
- 设计决策日志：[`docs/design-journal/`](./docs/design-journal/)

> 当前使用演示数据（`src/lib/sources/mock.ts`），资料正文均为占位文本；笔记、文件、偏好暂存在浏览器 localStorage。
