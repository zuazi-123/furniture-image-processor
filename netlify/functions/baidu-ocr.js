// 百度 OCR API 配置（在这里配置你的密钥）
const BAIDU_API_KEY = 'hVUSfUTax1bm4vIsiDRPi1pe'  // 替换为你的 API Key
const BAIDU_SECRET_KEY = 'G8gLHV61UjG7ng1Rr3WR3hWrLk1m3Abx'  // 替换为你的 Secret Key

// Access Token 缓存（有效期 30 天，这里缓存 25 天）
let cachedToken = null
let tokenExpireTime = 0

// 获取 Access Token（带缓存）
async function getAccessToken() {
  const now = Date.now()

  // 如果缓存的 token 还有效，直接返回
  if (cachedToken && now < tokenExpireTime) {
    return cachedToken
  }

  // 获取新的 token
  const tokenResponse = await fetch(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`
  )
  const tokenData = await tokenResponse.json()

  if (tokenData.error) {
    throw new Error(tokenData.error_description || '获取 Access Token 失败')
  }

  // 缓存 token（25 天有效期）
  cachedToken = tokenData.access_token
  tokenExpireTime = now + 25 * 24 * 60 * 60 * 1000

  return cachedToken
}

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

    // 获取 Access Token（使用缓存）
    const accessToken = await getAccessToken()

    // 调用 OCR API
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
