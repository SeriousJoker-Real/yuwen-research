# Vercel 一键部署指南

最简单的公网部署方案：整个项目（前端 + 后端 API）一键部署到 Vercel。

## 部署步骤

### 第一步：准备 GitHub 仓库

1. 注册/登录 GitHub：https://github.com
2. 创建一个新仓库（Public 或 Private 都可以）
3. 把本项目代码推送到 GitHub

### 第二步：部署到 Vercel

1. 访问 https://vercel.com，用 GitHub 账号登录
2. 点击 **Add New...** → **Project**
3. 在 Import Git Repository 中找到你刚才的仓库，点击 **Import**
4. 配置项目：
   - **Project Name**：随便起，比如 `yuwen-research`
   - **Framework Preset**：选 `Other`
   - **Root Directory**：保持默认（`./`）
   - **Build Command**：留空
   - **Output Directory**：填 `public`
5. **Environment Variables**（环境变量）添加：
   - `COZE_API_TOKEN`：你的扣子 API Token
   - `COZE_BOT_ID`：你的扣子 Bot ID
   
   > 这两个不填也能部署，只是 AI 功能会用本地模板代替。

6. 点击 **Deploy**，等待 1-2 分钟

### 第三步：获取公网地址

部署成功后，Vercel 会给你一个域名，例如：
- `https://yuwen-research.vercel.app`

🎉 完成！这个地址就是公网可访问的地址了。

## 📱 使用方式

### 教师端
打开：`https://你的域名.vercel.app/teacher/`

### 学生端
每个调研有专属链接和二维码：
- 链接：`https://你的域名.vercel.app/student/?survey=调研ID`
- 二维码：在教师端点击「📱 二维码」按钮生成

### 报告页
打开：`https://你的域名.vercel.app/report/?survey=调研ID`

## 🔑 获取扣子 API Token

1. 访问：https://www.coze.cn/open/oauth/pats
2. 点击「添加新令牌」
3. 填写名称，选择权限（至少包含 bot 相关权限）
4. 复制生成的 Token（只显示一次，记得保存）

## 🤖 创建扣子智能体（Bot）

1. 访问：https://www.coze.cn
2. 创建一个新的 Bot
3. 在系统提示词中粘贴 `agent/system-prompt.md` 的内容
4. 发布 Bot
5. 复制 Bot ID（在 Bot 设置页面可以找到）

## ⚠️ 注意事项

### 数据存储
Vercel Serverless Functions 的文件系统是**临时的**：
- 每次部署会重置
- 函数冷启动后数据可能丢失

**生产使用建议**：接上一个真正的数据库，比如：
- [Supabase](https://supabase.com)（推荐，免费额度大）
- [PlanetScale](https://planetscale.com)（MySQL）
- 或者用飞书多维表格 / Airtable

### 配额
Vercel 免费版：
- 每月 100GB 带宽
- 每月 100,000 次函数调用
- 完全够几十个班级日常使用

### 自定义域名
如果想用自己的域名：
1. 在 Vercel 项目设置 → Domains
2. 添加你的域名
3. 按提示配置 DNS 解析
4. Vercel 自动配置 HTTPS

## 📋 快速检查清单

- [ ] GitHub 仓库已创建并推送代码
- [ ] Vercel 导入项目成功
- [ ] 环境变量 COZE_API_TOKEN 已配置
- [ ] 环境变量 COZE_BOT_ID 已配置
- [ ] 部署成功，得到公网 URL
- [ ] 教师端可以正常打开
- [ ] 创建一个测试调研
- [ ] 生成二维码，手机扫码可以打开学生页
- [ ] 学生提交回答后，报告页可以看到分析结果
