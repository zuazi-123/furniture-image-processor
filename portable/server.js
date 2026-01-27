const express = require('express')
const path = require('path')
const { exec } = require('child_process')

const app = express()
const PORT = 8888

// 提供静态文件
app.use(express.static(path.join(__dirname, 'dist')))

// 所有路由都返回 index.html（支持 Vue Router）
app.get('*', (req, res) => {
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
