# UMI-OCR Docker 配置
# 基于 Python 3.9
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    wget \
    git \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# 克隆 UMI-OCR 仓库
RUN git clone --depth 1 https://github.com/hiroi-sora/Umi-OCR.git /app/umi-ocr

# 安装 Python 依赖
WORKDIR /app/umi-ocr
RUN pip install --no-cache-dir -r requirements.txt || \
    pip install --no-cache-dir flask pillow numpy opencv-python-headless rapidocr-onnxruntime

# 暴露端口
EXPOSE 1224

# 设置环境变量
ENV PORT=1224
ENV HOST=0.0.0.0

# 启动 HTTP 服务
CMD python main.py --no-gui --port ${PORT} --host ${HOST}
