const { app, BrowserWindow } = require('electron')
const path = require('path')
const http = require('http')
const https = require('https')
const url = require('url')

let mainWindow
let proxyServer

// 内嵌的代理服务器（不再作为子进程）
function startProxyServer() {
  const PORT = 3000

  const server = http.createServer((req, res) => {
    console.log(`\n收到请求: ${req.method} ${req.url}`)

    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }

    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Method not allowed' }))
      return
    }

    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })

    req.on('end', () => {
      try {
        const requestData = JSON.parse(body)
        const { apiKey, secretKey, image } = requestData

        if (!apiKey || !secretKey || !image) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing required parameters' }))
          return
        }

        // 获取 Access Token
        const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`

        https.get(tokenUrl, (tokenRes) => {
          let tokenData = ''
          tokenRes.on('data', chunk => { tokenData += chunk })
          tokenRes.on('end', () => {
            try {
              const tokenJson = JSON.parse(tokenData)
              if (tokenJson.error) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: tokenJson.error_description }))
                return
              }

              const accessToken = tokenJson.access_token
              // 使用通用文字识别（标准版）+ 增强参数
              const ocrUrl = `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${accessToken}`

              // 添加识别参数：检测语言类型、识别方向、概率值
              const postData = `image=${encodeURIComponent(image)}&detect_direction=true&language_type=CHN_ENG&probability=true`

              const ocrOptions = {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Content-Length': Buffer.byteLength(postData)
                }
              }

              const ocrReq = https.request(ocrUrl, ocrOptions, (ocrRes) => {
                let ocrData = ''
                ocrRes.on('data', chunk => { ocrData += chunk })
                ocrRes.on('end', () => {
                  res.writeHead(200, { 'Content-Type': 'application/json' })
                  res.end(ocrData)
                })
              })

              ocrReq.on('error', (error) => {
                console.error('OCR请求失败:', error)
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'OCR request failed' }))
              })

              ocrReq.write(postData)
              ocrReq.end()

            } catch (error) {
              console.error('解析Token响应失败:', error)
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Failed to parse token response' }))
            }
          })
        }).on('error', (error) => {
          console.error('获取Token失败:', error)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Failed to get access token' }))
        })

      } catch (error) {
        console.error('解析请求失败:', error)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid request body' }))
      }
    })
  })

  server.listen(PORT, () => {
    console.log(`\n========================================`)
    console.log(`  百度OCR代理服务器已启动！`)
    console.log(`  监听端口: ${PORT}`)
    console.log(`========================================\n`)
  })

  proxyServer = server
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // 允许加载本地资源
      webSecurity: false
    },
    icon: path.join(__dirname, 'icon.png')
  })

  // 开发环境加载 Vite 服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // 生产环境加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'))
    // 生产环境不打开开发者工具
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  // 先启动代理服务器
  startProxyServer()

  // 等待1秒后创建窗口
  setTimeout(() => {
    createWindow()
  }, 1000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // 关闭代理服务器
  if (proxyServer) {
    proxyServer.close()
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  // 确保代理服务器被关闭
  if (proxyServer) {
    proxyServer.close()
  }
})
