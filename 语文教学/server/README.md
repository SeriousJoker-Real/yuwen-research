# 后端服务说明

## 功能
- 提供前端页面静态文件服务
- REST API：调研管理、学生回答、AI分析
- 对接扣子智能体 API，实现AI出题和学情分析
- JSON 文件持久化存储

## 快速开始

### 1. 安装依赖
```bash
cd server
npm install
```

### 2. 配置扣子 API
```bash
cp .env.example .env
```
然后编辑 `.env` 文件，填入你的扣子 API Token 和 Bot ID：
- `COZE_API_TOKEN`：扣子个人访问令牌，在 https://www.coze.cn/open/oauth/pats 获取
- `COZE_BOT_ID`：你创建的智能体的 Bot ID

### 3. 启动服务
```bash
npm start
```

### 4. 访问
- 首页：http://localhost:8080/
- 教师端：http://localhost:8080/teacher/
- 学生端：http://localhost:8080/student/?survey=demo-001
- 报告页：http://localhost:8080/report/?survey=demo-001

## API 接口

### 调研管理
- `GET /api/surveys` - 获取所有调研列表
- `GET /api/surveys/:id` - 获取单个调研详情
- `POST /api/surveys` - 创建调研
- `PUT /api/surveys/:id` - 更新调研
- `DELETE /api/surveys/:id` - 删除调研

### 学生回答
- `GET /api/surveys/:id/responses` - 获取调研的所有回答
- `POST /api/surveys/:id/responses` - 提交学生回答

### AI 能力
- `POST /api/ai/generate-questions` - AI生成调研题目
  - body: `{ textTitle, textAuthor, textType, gradeLevel, textContent }`
- `POST /api/ai/analyze` - AI分析学生回答并生成报告
  - body: `{ surveyId }`

## 数据存储
所有数据以 JSON 文件形式存储在 `data/` 目录下：
- `data/surveys.json` - 所有调研配置
- `data/responses/{surveyId}.json` - 每个调研的学生回答
