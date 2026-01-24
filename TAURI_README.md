# Tauri 桌面应用打包指南

## 🎉 配置完成！

您的项目已经成功配置了 Tauri，可以打包成桌面应用了！

---

## 📦 打包前准备

### Windows 系统需要安装：

1. **Microsoft Visual Studio C++ Build Tools**
   - 下载地址：https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - 安装时选择 "Desktop development with C++"

2. **WebView2 Runtime**（Windows 10/11 自带，无需安装）
   - 如果需要：https://developer.microsoft.com/microsoft-edge/webview2/

3. **Rust**（Tauri 的核心依赖）
   ```bash
   # 下载并安装 Rust
   # 访问：https://www.rust-lang.org/tools/install
   # 或使用命令：
   winget install --id Rustlang.Rustup
   ```

---

## 🚀 开发和打包命令

### 1. 开发模式（推荐先测试）

```bash
npm run tauri:dev
```

**说明：**
- 启动 Vite 开发服务器
- 自动打开 Tauri 桌面窗口
- 支持热更新
- 可以实时查看效果

### 2. 打包生产版本

```bash
npm run tauri:build
```

**说明：**
- 构建优化后的生产版本
- 生成安装包
- 打包时间：约 5-10 分钟（首次较慢）

---

## 📁 打包后的文件位置

打包完成后，安装包会生成在：

```
src-tauri/target/release/bundle/
├── msi/              # Windows 安装包 (.msi)
├── nsis/             # Windows 安装包 (.exe)
└── ...
```

### Windows 安装包：
- **MSI 格式**：`家具图片处理工具_1.0.0_x64_zh-CN.msi` (~5-10MB)
- **NSIS 格式**：`家具图片处理工具_1.0.0_x64-setup.exe` (~5-10MB)

---

## 💡 使用说明

### 用户安装流程：

1. **下载安装包**（.msi 或 .exe）
2. **双击安装**
3. **打开应用** ✅ 直接使用

### ⚠️ 注意事项：

- **UMI-OCR 需要单独安装**：用户需要在电脑上安装 UMI-OCR 并启动 HTTP 服务（端口 1224）
- **或者**：后续可以将 UMI-OCR 打包进应用（会增加体积到 ~50-100MB）

---

## 🔧 高级配置

### 修改应用信息

编辑 `src-tauri/tauri.conf.json`：

```json
{
  "productName": "家具图片处理工具",  // 应用名称
  "version": "1.0.0",                 // 版本号
  "identifier": "com.furniture.processor"  // 应用标识符
}
```

### 修改窗口大小

```json
{
  "app": {
    "windows": [{
      "width": 1400,      // 窗口宽度
      "height": 900,      // 窗口高度
      "minWidth": 1200,   // 最小宽度
      "minHeight": 800    // 最小高度
    }]
  }
}
```

### 修改应用图标

替换 `src-tauri/icons/` 目录下的图标文件

---

## 🐛 常见问题

### 1. 打包失败：找不到 Rust

**解决方案：**
```bash
# 安装 Rust
winget install --id Rustlang.Rustup

# 验证安装
rustc --version
cargo --version
```

### 2. 打包失败：找不到 Visual Studio

**解决方案：**
- 安装 Visual Studio Build Tools
- 确保选择了 "Desktop development with C++"

### 3. 开发模式启动失败

**解决方案：**
```bash
# 检查端口是否被占用
netstat -ano | findstr :5175

# 如果被占用，修改 vite.config.js 中的端口号
```

### 4. UMI-OCR 连接失败

**解决方案：**
- 确保 UMI-OCR 已启动 HTTP 服务
- 检查端口是否为 1224
- 检查防火墙设置

---

## 📊 打包体积对比

| 版本 | 大小 | 说明 |
|------|------|------|
| **Tauri 轻量版** | ~5-10MB | 需要用户安装 UMI-OCR |
| **Tauri 完整版** | ~50-100MB | 内置 UMI-OCR（待实现） |
| **Electron 版** | ~100-150MB | 内置 Chromium |

---

## 🎯 下一步计划

### 可选功能（后续可以添加）：

1. **内置 UMI-OCR**
   - 将 RapidOCR 打包进应用
   - 应用启动时自动启动 OCR 服务
   - 用户无需单独安装

2. **自动更新**
   - 检测新版本
   - 一键更新

3. **系统托盘**
   - 最小化到托盘
   - 快捷键支持

4. **离线模式**
   - 完全离线使用
   - 无需网络连接

---

## 📝 提交代码

配置完成后，记得提交代码：

```bash
git add .
git commit -m "feat: 添加 Tauri 桌面应用支持"
git push
```

---

## 🎉 恭喜！

您的项目现在可以打包成桌面应用了！

**测试流程：**
1. 运行 `npm run tauri:dev` 测试开发模式
2. 运行 `npm run tauri:build` 打包生产版本
3. 在 `src-tauri/target/release/bundle/` 找到安装包
4. 安装并测试

祝您使用愉快！🚀
