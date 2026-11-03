# 知林：独立预览版

这是「知林」的独立源码包。它不依赖 ChatGPT、OpenAI、Supabase 或 Floot；可部署在任意支持静态网站或 Docker 的服务上。

## 此版本能做什么

- 在知识地图和时间轴中查看同一组学习记录；
- 在浏览器本地新增、编辑和删除自己的学习足迹，记录实际学习日期；
- 亲手建立、修改、删除知识联系，区分已有依据与待检验的想法；示例森林的预设联系不会自动加入个人地图；
- 导入或下载 TXT、Markdown 笔记；
- 导出和导入 JSON 备份；首次打开时自动迁移旧版浏览器记录；
- 在示例森林和本机的“我的森林”之间切换。

## 重要限制

这是**公开预览版**。每个人的数据保存在当前浏览器的 IndexedDB 中，不会上传到服务器，也不会跨设备同步。旧版的 localStorage 记录会复制到新存储中，旧副本保留。清空浏览器网站数据仍会清空该设备的记录，请定期使用页面上的「导出备份」，将 JSON 文件保存在安全的位置；换设备时使用「导入备份」恢复。导入会替换当前设备的数据。

目前的「根据内容建议位置」仍是关键词匹配，不是 AI Agent，也没有自动阅读整本书、可靠资料导航或跨设备账户。后续可按实际使用反馈逐步开发 Guide。

## 本机运行

安装 Node.js 20 或更高版本后，在本目录执行：

```bash
npm install
npm run dev
```

打开终端显示的本机地址。

## 构建静态网站

```bash
npm install
npm run build
```

生成的 `out` 文件夹就是可以上传到任意静态网站服务的完整网站。

推送到 GitHub 的 `main` 分支后，仓库中的构建流程会自动运行并更新 `out`。如果仍使用服务器上 `git pull` 后复制 `out` 的方式部署，请先在 GitHub 的 Actions 页面确认「Build static preview」成功，再拉取最新提交。

## Docker 部署

服务器安装 Docker 后，在本目录执行：

```bash
docker build -t zhilin-preview .
docker run -d --name zhilin-preview --restart unless-stopped -p 80:80 zhilin-preview
```

在服务器上完成部署后，再按照云厂商与当地监管要求配置域名、备案和 HTTPS 后对外开放。

详细的中国大陆部署流程见 [部署指南.md](部署指南.md)。
