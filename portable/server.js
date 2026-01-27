const express = require('express')
const path = require('path')
const { exec } = require('child_process')

const app = express()
const PORT = 8888

// 解析 JSON 请求体
app.use(express.json())

// 本地认证端点（绕过 Netlify 函数）
app.post('/.netlify/functions/auth', (req, res) => {
  const { action, password } = req.body

  if (action === 'login') {
    // 本地环境：任意密码都可以登录
    res.json({
      success: true,
      expireTime: Date.now() + 24 * 60 * 60 * 1000 // 24小时后过期
    })
  } else if (action === 'admin-login') {
    // 管理员登录
    res.json({
      success: true
    })
  } else if (action === 'admin-get-records') {
    // 管理员数据
    res.json({
      ipStats: [],
      records: [],
      blockedIPs: []
    })
  } else {
    res.status(400).json({
      success: false,
      error: '未知操作'
    })
  }
})

// 提供静态文件
app.use(express.static(path.join(__dirname, 'dist')))

// 所有路由都返回 index.html（支持 Vue Router）
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// 启动服务器
app.listen(PORT, () => {
  console.log('========================================')
  console.log('  家具图片处理工具已启动！')
  console.log('========================================')
  console.log(`  访问地址: http://localhost:${PORT}`)
  console.log('========================================')
  console.log('')
  console.log('提示：')
  console.log('1. 请确保 UMI-OCR 已启动')
  console.log('2. 浏览器会自动打开，如未打开请手动访问上述地址')
  console.log('3. 使用完毕后，关闭此窗口即可停止服务')
  console.log('')
  console.log('按 Ctrl+C 可以停止服务')
  console.log('========================================')

  // 自动打开浏览器
  const url = `http://localhost:${PORT}`
  const platform = process.platform

  let command
  if (platform === 'win32') {
    command = `start ${url}`
  } else if (platform === 'darwin') {
    command = `open ${url}`
  } else {
    command = `xdg-open ${url}`
  }

  exec(command, (error) => {
    if (error) {
      console.log('无法自动打开浏览器，请手动访问:', url)
    }
  })
})
