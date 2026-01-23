// IP 管理和认证系统
// 使用 Netlify Blobs 存储数据（持久化存储）

const { getStore } = require('@netlify/blobs')

// 管理员密码
const ADMIN_PASSWORD = 'admin2024'

// 获取客户端真实 IP
const getClientIP = (event) => {
  return event.headers['x-forwarded-for']?.split(',')[0].trim() ||
         event.headers['x-real-ip'] ||
         event.headers['client-ip'] ||
         'unknown'
}

// 获取 IP 地理位置信息（使用免费 API）
const getIPLocation = async (ip) => {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`)
    const data = await response.json()
    if (data.status === 'success') {
      return {
        country: data.country,
        region: data.regionName,
        city: data.city,
        isp: data.isp
      }
    }
  } catch (error) {
    console.error('获取IP位置失败:', error)
  }
  return { country: '未知', region: '未知', city: '未知', isp: '未知' }
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const store = getStore('auth-data')
    const { action, password, adminPassword, ipToBlock } = JSON.parse(event.body || '{}')
    const clientIP = getClientIP(event)

    // 获取或初始化数据
    let authData = await store.get('auth-data', { type: 'json' })
    if (!authData) {
      authData = {
        passwords: {
          'furniture2024': { active: true },
          'admin123': { active: true },
          'guest001': { active: true },
          'guest002': { active: true },
          'guest003': { active: true },
        },
        blockedIPs: [],
        loginRecords: []
      }
    }

    // 检查 IP 是否被封禁
    if (authData.blockedIPs.includes(clientIP) && action !== 'admin-login' && action !== 'admin-unblock') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: '您的 IP 已被管理员封禁，无法访问',
          blocked: true
        })
      }
    }

    // 用户登录
    if (action === 'login') {
      if (!password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '缺少密码' })
        }
      }

      // 检查密码是否存在且激活
      if (!authData.passwords[password] || !authData.passwords[password].active) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: '密码错误或已被禁用' })
        }
      }

      // 获取 IP 位置信息
      const location = await getIPLocation(clientIP)

      // 记录登录
      const loginRecord = {
        password: password,
        ip: clientIP,
        location: location,
        timestamp: Date.now(),
        userAgent: event.headers['user-agent'] || 'unknown'
      }

      authData.loginRecords.push(loginRecord)

      // 只保留最近 1000 条记录
      if (authData.loginRecords.length > 1000) {
        authData.loginRecords = authData.loginRecords.slice(-1000)
      }

      // 保存数据
      await store.set('auth-data', JSON.stringify(authData))

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '登录成功',
          expireTime: Date.now() + 7 * 24 * 60 * 60 * 1000
        })
      }
    }

    // 管理员登录
    if (action === 'admin-login') {
      if (adminPassword !== ADMIN_PASSWORD) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: '管理员密码错误' })
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '管理员登录成功'
        })
      }
    }

    // 获取登录记录（管理员）
    if (action === 'admin-get-records') {
      if (adminPassword !== ADMIN_PASSWORD) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: '管理员密码错误' })
        }
      }

      // 按时间倒序排列
      const records = authData.loginRecords.sort((a, b) => b.timestamp - a.timestamp)

      // 统计每个 IP 的登录次数和使用的密码
      const ipStats = {}
      records.forEach(record => {
        if (!ipStats[record.ip]) {
          ipStats[record.ip] = {
            ip: record.ip,
            location: record.location,
            passwords: new Set(),
            loginCount: 0,
            lastLogin: record.timestamp,
            blocked: authData.blockedIPs.includes(record.ip)
          }
        }
        ipStats[record.ip].passwords.add(record.password)
        ipStats[record.ip].loginCount++
      })

      // 转换 Set 为 Array
      Object.values(ipStats).forEach(stat => {
        stat.passwords = Array.from(stat.passwords)
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          records: records.slice(0, 100), // 最近 100 条
          ipStats: Object.values(ipStats),
          blockedIPs: authData.blockedIPs
        })
      }
    }

    // 封禁 IP（管理员）
    if (action === 'admin-block-ip') {
      if (adminPassword !== ADMIN_PASSWORD) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: '管理员密码错误' })
        }
      }

      if (!ipToBlock) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '缺少 IP 地址' })
        }
      }

      if (!authData.blockedIPs.includes(ipToBlock)) {
        authData.blockedIPs.push(ipToBlock)
        await store.set('auth-data', JSON.stringify(authData))
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `IP ${ipToBlock} 已被封禁`
        })
      }
    }

    // 解封 IP（管理员）
    if (action === 'admin-unblock-ip') {
      if (adminPassword !== ADMIN_PASSWORD) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: '管理员密码错误' })
        }
      }

      if (!ipToBlock) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '缺少 IP 地址' })
        }
      }

      authData.blockedIPs = authData.blockedIPs.filter(ip => ip !== ipToBlock)
      await store.set('auth-data', JSON.stringify(authData))

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `IP ${ipToBlock} 已解封`
        })
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
      body: JSON.stringify({ error: '服务器错误: ' + error.message })
    }
  }
}
