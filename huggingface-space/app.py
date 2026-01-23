import gradio as gr
from paddleocr import PaddleOCR
import base64
import io
from PIL import Image
import numpy as np
import json

# 初始化 PaddleOCR
ocr = PaddleOCR(use_angle_cls=True, lang='ch', use_gpu=False)

def ocr_api(image_base64):
    """OCR API 接口"""
    try:
        # 移除 base64 前缀
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]

        # 解码图片
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_bytes))
        img_array = np.array(image)

        # OCR 识别
        result = ocr.ocr(img_array, cls=True)

        # 格式化结果
        formatted_result = []
        if result and result[0]:
            for line in result[0]:
                text = line[1][0]
                score = line[1][1]
                formatted_result.append({
                    'text': text,
                    'score': score
                })

        return json.dumps({
            'code': 100,
            'data': formatted_result,
            'message': 'success'
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({
            'code': 500,
            'message': str(e)
        }, ensure_ascii=False)

# 创建 Gradio 接口
iface = gr.Interface(
    fn=ocr_api,
    inputs=gr.Textbox(label="Base64 图片数据", lines=5),
    outputs=gr.Textbox(label="识别结果 (JSON)"),
    title="PaddleOCR API",
    description="输入 base64 编码的图片，返回 OCR 识别结果",
    examples=[],
    api_name="ocr"
)

if __name__ == "__main__":
    iface.launch(server_name="0.0.0.0", server_port=7860)
