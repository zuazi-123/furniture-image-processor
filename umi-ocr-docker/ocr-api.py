#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的 OCR API 服务
使用 RapidOCR 进行文字识别
"""

import os
import io
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 初始化 OCR 引擎
ocr_engine = RapidOCR()

@app.route('/', methods=['GET'])
def index():
    """健康检查端点"""
    return jsonify({
        'status': 'ok',
        'message': 'OCR API Service is running',
        'version': '1.0.0'
    })

@app.route('/ocr', methods=['POST'])
def ocr():
    """OCR 识别端点"""
    try:
        # 获取图片数据
        json_data = request.get_json(silent=True) or {}

        if 'image' not in request.files and 'image_base64' not in json_data:
            return jsonify({'error': 'No image provided'}), 400

        # 处理文件上传
        if 'image' in request.files:
            file = request.files['image']
            image = Image.open(file.stream)
        # 处理 base64 编码
        elif 'image_base64' in json_data:
            image_data = base64.b64decode(json_data['image_base64'])
            image = Image.open(io.BytesIO(image_data))

        # 转换为 RGB 模式（如果需要）
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # 执行 OCR 识别
        result, elapse = ocr_engine(image)

        # 格式化结果
        if result is None:
            return jsonify({
                'success': True,
                'words': [],
                'text': '',
                'elapse': elapse
            })

        # 提取文字
        words = []
        full_text = []
        for line in result:
            text = line[1]
            confidence = line[2]
            words.append({
                'text': text,
                'confidence': confidence
            })
            full_text.append(text)

        return jsonify({
            'success': True,
            'words': words,
            'text': ' '.join(full_text),
            'elapse': elapse
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    host = os.environ.get('HOST', '0.0.0.0')
    app.run(host=host, port=port, debug=False)
