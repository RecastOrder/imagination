# 部署到云服务器（已定：先放云上试用）

> 这份文档写给负责部署的人。每一步都可以照着做；有“⚠️”的地方要特别注意。

## 一、整体结构

```
 同事的浏览器（电脑 / 手机）
        │ https://imagination.你的域名
        ▼
 ┌──────────── 云服务器（一台） ────────────┐
 │  Caddy：自动申请 HTTPS 证书、转发请求       │
 │     │                                    │
 │     ▼                                    │
 │  Imagination（Node 22 + LibreOffice）      │
 │     │                                    │
 │     ▼                                    │
 │  deploy/data/  ← 数据库、Office 预览缓存、备份 │
 └──────────────────────────────────────────┘
        │ 每周复制一份备份
        ▼
   公司的群晖 NAS
```

都用 Docker 运行：服务器上只需要装 Docker，不用单独装 Node、数据库、LibreOffice。

## 二、先决定的几件事

| 事项 | 建议 |
|---|---|
| 服务器配置 | 2 核 4 GB 内存起步，系统盘 40 GB 以上（Office 转换比较吃内存） |
| 系统 | Ubuntu 22.04 / 24.04 |
| 地域 | **中国内地**（上海 / 杭州等）：访问快、稳定，但域名必须先做 **ICP 备案**（通常 1–3 周）<br>**中国香港**：不用备案、可以马上用，但从内地访问有时慢、不稳定 |
| 域名 | 用公司已有域名的一个子域名，例如 `imagination.公司域名.com` |
| 邮件 | Resend：需要在 Resend 后台验证发件域名（添加几条 DNS 记录） |

⚠️ 如果选内地服务器、备案还没下来：可以先用服务器 IP 加端口在内部试，但没有 HTTPS，登录 Cookie 需要临时设置 `AUTH_INSECURE_COOKIE=1`——**只能在试用阶段这样做**。

## 三、第一次部署

```bash
# 1. 在服务器上装 Docker（Ubuntu）
curl -fsSL https://get.docker.com | sh

# 2. 取代码
git clone <仓库地址> imagination && cd imagination/deploy

# 3. 填配置
cp .env.example .env
nano .env        # 按下面的表格填写

# 4. 数据目录：平台在容器里用 node 用户（编号 1000）运行，要能写这个目录
mkdir -p data && chown 1000:1000 data

# 5. 启动（第一次会构建镜像，需要几分钟）
docker compose up -d --build

# 6. 看日志：出现 “Ready” 就好了
docker compose logs -f app
```

`.env` 要填的内容：

| 变量 | 填什么 | 必填 |
|---|---|---|
| `DOMAIN` | 域名，如 `imagination.firm.cn`（先把这个域名解析到服务器 IP） | ✓ |
| `APP_URL` | `https://` + 域名，邮件里的链接会用它 | ✓ |
| `AUTH_SECRET` | 运行 `openssl rand -base64 48` 生成的一串字符。**不填服务器会拒绝启动** | ✓ |
| `INITIAL_ADMIN_EMAIL` | 第一位管理员的工作邮箱。启动后用它登录，再邀请其他人 | ✓ |
| `RESEND_API_KEY`、`RESEND_FROM` | 邮件服务。不填时验证码只会写在服务器日志里 | 正式使用必填 |
| `DEMO_DATA` | `1` = 带示例成员和示例项目（演示用）；`0` = 干净的空平台 | |

⚠️ 安全相关（已经在代码里做了保护）：
- 正式环境下，登录页**不会**显示验证码；只有明确设置 `AUTH_DEMO=on` 才会（只用于内部演示，千万不要在正式使用时打开）。
- `.env` 里有密钥，不要提交到代码仓库、不要发到群里。

## 四、日常运维

**升级到新版本**

```bash
cd imagination && git pull
cd deploy && docker compose up -d --build
```

数据在 `deploy/data/`，升级不会丢。

**备份**（建议：每天一次，保留 30 天；每周复制一份到 NAS）

```bash
# 手动备份一次：生成 deploy/data/backups/imagination-时间.db
docker compose exec app npm run db:backup

# 每天凌晨 3 点自动备份：crontab -e 加一行
0 3 * * * cd /root/imagination/deploy && docker compose exec -T app npm run db:backup && find data/backups -name '*.db' -mtime +30 -delete
```

复制到群晖：在群晖上用“Hyper Backup”或 `rsync` 定期拉取 `deploy/data/backups/`。

**恢复**：停掉服务 → 用某个备份文件替换 `deploy/data/imagination.db` → 启动。

```bash
docker compose stop app
cp data/backups/imagination-2026-09-25T03-00-00.db data/imagination.db
rm -f data/imagination.db-wal data/imagination.db-shm
docker compose start app
```

## 五、还没有做、上线前要补的

| 事项 | 说明 |
|---|---|
| 文件存储 | 现在“文件浏览”里是示例文件；真实文件要接对象存储（阿里云 OSS / 腾讯云 COS）或 NAS，并按权限发下载地址 |
| 查看记录 | 接上真实文件后，在“发下载地址”那一步记录，才无法绕过 |
| 监控 | 服务挂了要有人知道：可以先用云厂商自带的“云监控”对 `https://域名/login` 做可用性检测 |
| 邮件到达率 | 公司邮箱可能把新域名的邮件当垃圾邮件：Resend 后台的 SPF / DKIM 记录都要配好，第一次让大家把发件地址加白名单 |

## 六、本地模拟正式环境（开发者用）

```bash
npm run build
AUTH_SECRET=$(openssl rand -base64 48) DATA_DIR=/tmp/imagination-data DEMO_DATA=1 AUTH_DEMO=on npm run start
```
