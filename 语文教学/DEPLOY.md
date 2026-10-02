# 语文课前调研智能体 · 部署指南

## 📱 扫码访问实现原理

```
教师生成二维码 → 学生扫码 → 打开浏览器 → 填写调研 → 提交 → AI分析
```

二维码本质上就是一个 URL 链接，用手机扫码后自动在浏览器打开对应的页面。

---

## 🚀 推荐部署方案：Coze Pages + Vercel

**优点**：免费、公网可访问、无需服务器、无需备案

### 第一步：部署后端到 Vercel

#### 前置准备
1. 注册 [Vercel](https://vercel.com) 账号（GitHub 登录即可）
2. 把项目推送到 GitHub

#### 部署步骤
1. Vercel 控制台 → New Project → Import 你的 GitHub 仓库
2. Framework Preset 选 **Other**
3. Root Directory 保持默认
4. Environment Variables 添加：
   ```
   COZE_API_TOKEN = 你的扣子API Token
   COZE_BOT_ID = 你的扣子Bot ID
   ```
5. 点击 Deploy，等待部署完成

部署成功后你会得到一个 URL，例如：`https://yuwen-research.vercel.app`

### 第二步：部署前端到 Coze Pages

#### 前置准备
```bash
# 安装 Coze CLI（首次）
npm install -g @coze-arch/cli@0.1.7

# 登录
coze-dev auth login
```

#### 修改前端 API 地址
编辑 `public/config.js`，把 API_BASE 改成你的 Vercel 后端地址：
```js
const API_BASE = 'https://你的-vercel-地址.vercel.app/api';
```

#### 部署
```bash
cd 语文教学
coze-dev deploy --source-root . --application-type pages --name 语文课前调研 --yes
```

部署成功后得到公网 URL，例如：`https://xxx.coze.run`

### 第三步：使用

1. 教师打开 `https://你的地址/teacher/`
2. 创建调研 → 发布 → 生成二维码
3. 学生用手机扫码 → 填写调研 → 提交
4. 教师查看报告

---

## 🎯 最简单方案：内网穿透（临时试用）

如果你只是想临时试用，不想部署，可以用内网穿透工具把本地服务暴露到公网。

### 使用 cpolar

```bash
# 1. 启动本地服务
cd server
npm install
npm start

# 2. 另开终端，启动 cpolar
cpolar http 8080
```

cpolar 会给你一个公网地址（如 `https://xxx.cpolar.io`），这个地址生成的二维码就可以扫码访问了。

**注意**：免费版 cpolar 每次重启地址会变，适合临时演示用。

---

## 🏫 国内稳定方案：云服务器 + 备案域名

如果需要长期稳定使用，建议用国内云服务器：

1. 购买阿里云/腾讯云轻量服务器
2. 购买域名并备案
3. 部署 Node.js 服务
4. 配置 HTTPS（微信扫码要求 HTTPS）
5. 生成二维码

---

## 📲 二维码使用说明

### 教师端二维码
- 每个调研都有专属二维码
- 在调研卡片上点击「📱 二维码」按钮
- 可以下载二维码图片打印或投影到课堂上
- 学生扫码直达该调研的填写页面

### 首页二维码
- 总入口二维码，扫码后进入首页
- 学生可以选择自己的调研

### 注意事项
- 扫码访问需要 HTTPS（大部分部署平台默认支持）
- 建议把二维码打印出来贴在教室，或通过微信群发送
- 第一次扫码可能需要学生授权浏览器打开链接

---

## 🔧 常见问题

### Q: 学生扫码后打不开？
A: 检查是否部署成功、链接是否正确、是否需要 HTTPS。

### Q: 数据会不会丢失？
A: Vercel Serverless Functions 的文件系统是临时的，每次部署/冷启动会重置。生产使用建议接上数据库（如 Supabase、PlanetScale）。

### Q: 能微信扫码直接在微信里打开吗？
A: 可以。只要是 HTTPS 的网页，微信扫码就能直接在微信内置浏览器打开填写。

### Q: 需要备案吗？
A: 用 Vercel 或其他境外平台不需要备案。如果用国内云服务器且绑定国内域名，则需要备案。
