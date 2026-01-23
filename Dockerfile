# 基于 Python 3.9 的轻量级 OCR API 服务
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制 requirements 文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY ocr-api.py .

# 暴露端口
EXPOSE 10000

# 设置环境变量
ENV PORT=10000
ENV HOST=0.0.0.0

# 启动服务
CMD python ocr-api.py
