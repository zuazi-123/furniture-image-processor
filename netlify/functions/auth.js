// 简单的密码管理系统
// 注意：这是一个基础实现，生产环境建议使用数据库

// 密码配置：每个密码只能被一个设备使用
const passwords = {
  'furniture2024': { used: false, deviceId: null, expireTime: null },
  'admin123': { used: false, deviceId: null, expireTime: null },
  'guest001': { used: false, deviceId: null, expireTime: null },
  'guest002': { used: false, deviceId: null, expireTime: null },
  'guest003': { used: false, deviceId: null, expireTime: null },
}

// 会话有效期：7天
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000

exports.handler = async (event, context) => {
  // 设置 CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // 处理 OPTIONS 请求
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { action, password, deviceId } = JSON.parse(event.body)

    // 登录操作
    if (action === 'login') {
      if (!password || !deviceId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '缺少必要参数' })
        }
      }

      // 检查密码是否存在
      if (!passwords[password]) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: '密码错误' })
        }
      }

      const passwordInfo = passwords[password]
      const now = Date.now()

      // 检查密码是否已被使用
      if (passwordInfo.used) {
        // 如果是同一个设备，允许登录（续期）
        if (passwordInfo.deviceId === deviceId) {
          // 检查是否过期
          if (passwordInfo.expireTime && passwordInfo.expireTime > now) {
            // 续期
            passwordInfo.expireTime = now + SESSION_DURATION
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                message: '登录成功',
                expireTime: passwordInfo.expireTime
              })
            }
          } else {
            // 已过期，重新分配
            passwordInfo.used = true
            passwordInfo.deviceId = deviceId
            passwordInfo.expireTime = now + SESSION_DURATION
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                message: '登录成功',
                expireTime: passwordInfo.expireTime
              })
            }
          }
        } else {
          // 不同设备，检查是否过期
          if (passwordInfo.expireTime && passwordInfo.expireTime > now) {
            return {
              statusCode: 403,
              headers,
              body: JSON.stringify({
                error: '该密码已被其他设备使用，请联系管理员获取新密码'
              })
            }
          } else {
            // 已过期，可以重新分配给新设备
            passwordInfo.used = true
            passwordInfo.deviceId = deviceId
            passwordInfo.expireTime = now + SESSION_DURATION
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                message: '登录成功',
                expireTime: passwordInfo.expireTime
              })
            }
          }
        }
      } else {
        // 密码未被使用，分配给当前设备
        passwordInfo.used = true
        passwordInfo.deviceId = deviceId
        passwordInfo.expireTime = now + SESSION_DURATION
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: '登录成功',
            expireTime: passwordInfo.expireTime
          })
        }
      }
    }

    // 验证操作
    if (action === 'verify') {
      if (!password || !deviceId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '缺少必要参数' })
        }
      }

      if (!passwords[password]) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: '无效的会话' })
        }
      }

      const passwordInfo = passwords[password]
      const now = Date.now()

      // 验证设备ID和过期时间
      if (passwordInfo.deviceId === deviceId &&
          passwordInfo.expireTime &&
          passwordInfo.expireTime > now) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            valid: true,
            expireTime: passwordInfo.expireTime
          })
        }
      } else {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ valid: false, error: '会话已过期或无效' })
        }
      }
    }

    // 登出操作
    if (action === 'logout') {
      if (!password || !deviceId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '缺少必要参数' })
        }
      }

      if (passwords[password] && passwords[password].deviceId === deviceId) {
        passwords[password].used = false
        passwords[password].deviceId = null
        passwords[password].expireTime = null
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: '已登出' })
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '未知操作' })
    }

  } catch (error) {
    console.error('认证错误:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '服务器错误' })
    }
  }
}
