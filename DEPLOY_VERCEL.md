# ArchiveScope 部署说明

## 适合本项目的方式

本项目推荐使用 `GitHub + Vercel` 部署公开前台版。

原因：

- 项目是 `Next.js`，不是纯静态 HTML。
- 项目包含动态路由和 `api` 目录。
- AI 补全、快照补全、爬取、后台批处理更适合保留在本地，不建议直接开放到线上。

## 上线目标

本次上线建议只部署：

- 公开前台页面
- 只读展示能力

不建议直接在线开放：

- 本地管理员工作台
- AI 自动补全
- 快照批处理
- 爬虫与自动采集

## 第一步：准备环境变量

本地已有 `.env.local`，不要上传。

线上部署时建议最少配置：

```env
ADMIN_ACTIONS_ENABLED=false
ADMIN_USERNAME=你的管理员用户名
ADMIN_PASSWORD=你的管理员密码
```

说明：

- `ADMIN_ACTIONS_ENABLED=false`：关闭线上前台管理员动作。
- `ADMIN_USERNAME` / `ADMIN_PASSWORD`：保护 `/admin` 和 `/api/admin`。

## 第二步：提交代码到 GitHub

当前仓库只有初始提交，实际网站改动还没有正式提交。

建议流程：

1. 检查 `.env.local` 没有被加入版本控制。
2. 提交你现在的网站代码。
3. 在 GitHub 新建一个仓库。
4. 绑定远程仓库并推送 `main` 分支。

## 第三步：在 Vercel 导入仓库

1. 登录 Vercel。
2. 选择 `Add New Project`。
3. 导入你的 GitHub 仓库。
4. Root Directory 选择项目目录：`archivescope`。
5. Framework Preset 保持 `Next.js`。
6. Build Command 保持默认 `next build`。
7. 点击部署。

## 第四步：配置线上环境变量

在 Vercel 项目设置里添加：

- `ADMIN_ACTIONS_ENABLED=false`
- `ADMIN_USERNAME=...`
- `ADMIN_PASSWORD=...`

如果只是前台展示版，不建议把 AI 和 Firecrawl 的 key 先放到线上。

## 第五步：部署后检查

上线后优先检查：

1. 首页是否正常打开。
2. `/resources`、`/institutions`、`/topics`、`/atlas` 是否正常打开。
3. 随机点开几条详情页，确认动态路由正常。
4. `/admin` 是否被保护，没有直接暴露给普通访问者。

## 第六步：后续迭代方式

以后每次更新内容或页面：

1. 本地修改
2. 本地 `npm run build`
3. 提交到 GitHub
4. Vercel 自动重新部署

## 当前最推荐策略

保留“两套环境”：

- 本地：完整后台、AI、快照、采集
- 线上：稳定前台展示版

这样最适合比赛提交，也最稳妥。
