# UMI-OCR Docker 部署说明

## 方案：使用免费云服务部署 UMI-OCR

### 步骤1：准备 Docker 镜像

1. **测试本地构建**（可选）
```bash
cd umi-ocr-docker
docker build -t umi-ocr .
docker run -p 1224:1224 umi-ocr
```

2. **访问测试**
```
http://localhost:1224
```

### 步骤2：部署到 Railway.app（推荐）

#### 2.1 注册账号
- 访问 https://railway.app/
- 使用 GitHub 账号登录
- 免费额度：每月 $5 credit

#### 2.2 创建新项目
1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 选择您的仓库（需要先将 Dockerfile 推送到 GitHub）

#### 2.3 配置
- Railway 会自动检测 Dockerfile
- 设置端口：1224
- 等待部署完成

#### 2.4 获取服务地址
- Railway 会提供一个公网地址，如：`https://umi-ocr-production.up.railway.app`

### 步骤3：修改网站代码

在 Netlify 配置环境变量：
```
VITE_UMI_OCR_URL=https://your-umi-ocr.railway.app
```

### 步骤4：更新代码

修改 `index.vue` 中的默认 OCR 引擎和地址。

---

## 替代方案：Render.com

### 优点
- 完全免费
- 支持 Docker

### 缺点
- 15分钟无请求会自动休眠
- 首次唤醒需要等待 30-60 秒

### 部署步骤
1. 访问 https://render.com/
2. 注册账号
3. 创建 "New Web Service"
4. 连接 GitHub 仓库
5. 选择 Docker 运行时
6. 部署

---

## 注意事项

### 1. UMI-OCR 的限制
- UMI-OCR 可能不支持纯 HTTP API 模式
- 需要检查是否有官方的 Docker 镜像或 API 服务

### 2. 性能考虑
- 免费服务器性能有限
- OCR 识别速度可能较慢
- 建议添加请求队列和超时处理

### 3. 成本
- Railway: 每月 $5 免费额度，超出后按量计费
- Render: 完全免费，但有休眠限制

---

## 推荐方案

**如果预算允许（每月 $5-10）：**
- 使用 Railway.app 或 Render.com 付费版
- 性能稳定，无休眠

**如果完全免费：**
- 继续使用百度 OCR 免费额度（每天 500 次）
- 或者使用 Render.com 免费版（接受休眠延迟）

**最佳方案：**
- 主要使用百度 OCR（免费额度）
- UMI-OCR 作为备用（用户可选）
- 当百度额度用完时，提示用户切换到 UMI-OCR
