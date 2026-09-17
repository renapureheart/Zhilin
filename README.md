# 知林：独立预览版

这是「知林」的独立源码包。它不依赖 ChatGPT、OpenAI、Supabase 或 Floot；可部署在任意支持静态网站或 Docker 的服务上。

## 此版本能做什么

- 展示知识森林、学习足迹和知识联系；
- 在浏览器本地新增、编辑和删除自己的学习足迹；
- 导入或下载 TXT、Markdown 笔记；
- 在示例森林和本机的“我的森林”之间切换。

## 重要限制

这是**公开预览版**。每个人的数据只保存在自己的浏览器中，不会上传到服务器，也不会跨设备同步。清空浏览器网站数据会清空该设备的记录。

要做正式版（大陆手机号验证码、个人账户、跨设备同步、文件云存储），需要增加后端、数据库和短信服务。预览版的页面和知识地图可以继续沿用。

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

## Docker 部署

服务器安装 Docker 后，在本目录执行：

```bash
docker build -t zhilin-preview .
docker run -d --name zhilin-preview --restart unless-stopped -p 80:80 zhilin-preview
```

在服务器上完成部署后，再按照云厂商与当地监管要求配置域名、备案和 HTTPS 后对外开放。

详细的中国大陆部署流程见 [部署指南.md](部署指南.md)。
