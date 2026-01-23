// 百度 OCR API 配置（在这里配置你的密钥）
const BAIDU_API_KEY = 'your_api_key_here'  // 替换为你的 API Key
const BAIDU_SECRET_KEY = 'your_secret_key_here'  // 替换为你的 Secret Key

exports.handler = async (event, context) => {
  // 只允许 POST 请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { image } = JSON.parse(event.body)

    if (!image) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing image parameter' })
      }
    }

    // 使用服务器端配置的密钥
    const apiKey = BAIDU_API_KEY
    const secretKey = BAIDU_SECRET_KEY

    // 步骤1: 获取 Access Token
    const tokenResponse = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
    )
    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          error_msg: tokenData.error_description
        })
      }
    }

    const accessToken = tokenData.access_token

    // 步骤2: 调用 OCR API
    const ocrResponse = await fetch(
      `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `image=${encodeURIComponent(image)}`
      }
    )

    const ocrData = await ocrResponse.json()

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(ocrData)
    }

  } catch (error) {
    console.error('代理错误:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: true,
        error_msg: error.message
      })
    }
  }
}
