// 百度OCR代理服务器（开发环境使用）
// 解决浏览器跨域问题

const http = require('http');
const https = require('https');

const PORT = 3000;

const server = http.createServer((req, res) => {
  console.log(`\n收到请求: ${req.method} ${req.url}`);

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const requestData = JSON.parse(body);
      const { apiKey, secretKey, image } = requestData;

      if (!apiKey || !secretKey || !image) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing required parameters' }));
        return;
      }

      // 获取 Access Token
      const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;

      https.get(tokenUrl, (tokenRes) => {
        let tokenData = '';
        tokenRes.on('data', chunk => { tokenData += chunk });
        tokenRes.on('end', () => {
          try {
            const tokenJson = JSON.parse(tokenData);
            if (tokenJson.error) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: tokenJson.error_description }));
              return;
            }

            const accessToken = tokenJson.access_token;
            // 使用通用文字识别（标准版）+ 增强参数
            const ocrUrl = `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${accessToken}`;

            // 添加识别参数：检测语言类型、识别方向、概率值
            const postData = `image=${encodeURIComponent(image)}&detect_direction=true&language_type=CHN_ENG&probability=true`;

            const ocrOptions = {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
              }
            };

            const ocrReq = https.request(ocrUrl, ocrOptions, (ocrRes) => {
              let ocrData = '';
              ocrRes.on('data', chunk => { ocrData += chunk });
              ocrRes.on('end', () => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(ocrData);
              });
            });

            ocrReq.on('error', (error) => {
              console.error('OCR请求失败:', error);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'OCR request failed' }));
            });

            ocrReq.write(postData);
            ocrReq.end();

          } catch (error) {
            console.error('解析Token响应失败:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to parse token response' }));
          }
        });
      }).on('error', (error) => {
        console.error('获取Token失败:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to get access token' }));
      });

    } catch (error) {
      console.error('解析请求失败:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  百度OCR代理服务器已启动！`);
  console.log(`  监听端口: ${PORT}`);
  console.log(`  代理地址: http://localhost:${PORT}`);
  console.log(`========================================\n`);
  console.log(`请保持此窗口打开，然后在浏览器中使用工具。`);
  console.log(`按 Ctrl+C 可以停止服务器。\n`);
});
