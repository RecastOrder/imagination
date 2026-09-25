# Imagination 生产镜像（第 ⑨ 步：云服务器部署）
# 包含：Node 22（自带 SQLite）+ LibreOffice（Office 预览）+ 中文字体
FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1

# ---- 构建 ----
FROM base AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- 运行 ----
FROM base AS run
# LibreOffice 只装无界面版（writer / calc / impress），外加中文字体，Office 转 PDF 才不会缺字
RUN apt-get update \
 && apt-get install -y --no-install-recommends libreoffice-writer-nogui libreoffice-calc-nogui libreoffice-impress-nogui \
    fonts-noto-cjk fonts-wqy-zenhei ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data \
    OFFICE_CACHE_DIR=/data/office-previews
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/next.config.ts ./
# 数据（数据库、Office 预览缓存、备份）都放在 /data，挂载成宿主机目录，升级镜像不丢
VOLUME ["/data"]
USER node
EXPOSE 3000
CMD ["npx", "next", "start"]
