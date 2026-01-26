<template>
  <div class="furniture-processor">
    <h1>家具图片处理工具</h1>

    <!-- 模式切换 -->
    <div class="mode-tabs">
      <button
        :class="['mode-tab', { active: currentMode === 'text-image' }]"
        @click="switchMode('text-image')"
      >
        图文版
      </button>
      <button
        :class="['mode-tab', { active: currentMode === 'pure-image' }]"
        @click="switchMode('pure-image')"
      >
        纯图版
      </button>
    </div>

    <!-- 图文版内容 -->
    <div v-if="currentMode === 'text-image'" class="text-image-mode">
      <!-- 分类选择 -->
      <div class="category-section">
      <h3>选择家具分类</h3>
      <div class="category-tabs">
        <button
          v-for="cat in categories"
          :key="cat"
          :class="['category-tab', { active: currentCategory === cat }]"
          @click="switchCategory(cat)"
        >
          {{ cat }}
          <span v-if="furnitureByCategory[cat].length > 0" class="count-badge">
            {{ furnitureByCategory[cat].length }}
          </span>
        </button>
      </div>
    </div>

    <!-- 上传区域 -->
    <div class="upload-section">
      <input
        type="file"
        ref="fileInput"
        accept="image/*"
        multiple
        @change="handleFileUpload"
        style="display: none"
      />
      <button @click="$refs.fileInput.click()" class="upload-btn">
        📁 批量选择家具图片（{{ currentCategory }}）
      </button>
      <span v-if="fileName" class="file-name">{{ fileName }}</span>
      <span v-if="pendingFiles.length > 0" class="pending-info">
        [ 第 {{ currentFileIndex + 1 }}/{{ pendingFiles.length }} 张 ]
      </span>
    </div>

    <!-- 原图预览 -->
    <div v-if="uploadedImage" class="preview-section">
      <h3>原图预览 <span class="hint-text">（拖动绘制第一个框，点击框可取消/恢复裁剪）</span></h3>
      <div class="image-container"
           @mousedown="startDrawing"
           style="position: relative;">
        <img
          :src="uploadedImage"
          alt="原图"
          class="preview-image"
          ref="previewImage"
          style="user-select: none;"
        />
        <svg class="grid-overlay" v-if="uploadedImage"
             :viewBox="`0 0 ${imageWidth} ${imageHeight}`"
             style="pointer-events: none;">

          <!-- 用户绘制的第一个框（红色） -->
          <rect
            v-if="userRect.width > 0 && userRect.height > 0"
            :x="userRect.x"
            :y="userRect.y"
            :width="userRect.width"
            :height="userRect.height"
            fill="rgba(255, 0, 0, 0.2)"
            stroke="#ff0000"
            stroke-width="3"
            style="pointer-events: none;"
          />

          <!-- 自动生成的所有框（绿色=选中，灰色=未选中） -->
          <rect
            v-for="(rect, index) in allRects"
            :key="'rect-' + index"
            :x="rect.x"
            :y="rect.y"
            :width="rect.width"
            :height="rect.height"
            :fill="rect.selected ? 'rgba(0, 255, 0, 0.15)' : 'rgba(128, 128, 128, 0.15)'"
            :stroke="rect.selected ? '#00ff00' : '#888888'"
            stroke-width="2"
            style="cursor: pointer; pointer-events: all;"
            @click="toggleRect(index)"
            @mousedown.stop
          />
        </svg>
      </div>

      <div class="controls">
        <div class="control-group">
          <label>水平间距：</label>
          <input type="number" v-model.number="horizontalGap" min="0" max="100" step="1" style="width: 80px" />
          <span class="hint-text">像素（框与框之间的水平距离）</span>
        </div>
        <div class="control-group">
          <label>垂直间距：</label>
          <input type="number" v-model.number="verticalGap" min="0" max="100" step="1" style="width: 80px" />
          <span class="hint-text">像素（框与框之间的垂直距离）</span>
        </div>
        <div class="control-group">
          <button @click="clearRect" class="clear-btn">🗑️ 清除框</button>
          <button @click="toggleAllRects" class="toggle-btn" v-if="allRects.length > 0">
            {{ allRects.every(r => r.selected) ? '❌ 全不选' : '✅ 全选' }}
          </button>
          <span v-if="allRects.length > 0" class="hint-text">
            （已生成 {{ allRects.length }} 个框，选中 {{ allRects.filter(r => r.selected).length }} 个）
          </span>
        </div>
        <div class="control-group">
          <label>识别引擎：</label>
          <select v-model="ocrEngine" class="engine-select">
            <option value="baidu">百度 OCR（在线）</option>
            <option value="umi">RapidOCR（云端/本地）</option>
          </select>
          <span class="hint-text">{{ ocrEngine === 'baidu' ? '使用百度云 OCR' : '使用 RapidOCR 服务（免费无限制）' }}</span>
        </div>
        <div class="control-group" v-if="ocrEngine === 'umi'">
          <label>RapidOCR 地址：</label>
          <input type="text" v-model="umiOcrUrl" placeholder="https://furniture-image-processor.onrender.com" style="width: 350px" />
          <span class="hint-text">云端服务或本地服务地址</span>
        </div>
        <div class="control-group">
          <label>
            <input type="checkbox" v-model="enhanceImage" />
            图片增强（提高清晰度和对比度）
          </label>
          <span class="hint-text">推荐开启，可提高识别准确率</span>
        </div>
        <button @click="processImage()" class="process-btn">
          🔍 开始识别
        </button>
      </div>
    </div>

    <!-- 处理进度 -->
    <div v-if="processing" class="progress-section">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <p>正在处理：{{ progressText }}</p>
    </div>

    <!-- 识别结果 -->
    <div v-if="furnitureList.length > 0" class="results-section">
      <h3>识别结果（共 {{ furnitureList.length }} 件家具）</h3>

      <div class="furniture-grid">
        <div
          v-for="(item, index) in furnitureList"
          :key="index"
          class="furniture-item"
        >
          <button @click="deleteFurnitureItem(index)" class="delete-item-btn" title="删除此项">✕</button>
          <img :src="item.image" :alt="item.name" class="furniture-thumb" />
          <div class="furniture-info">
            <input
              v-model="item.name"
              placeholder="家具名称"
              class="input-name"
            />
            <input
              v-model="item.quantity"
              placeholder="数量"
              class="input-quantity"
            />
            <input
              v-model="item.price"
              placeholder="价格"
              class="input-price"
            />
          </div>
        </div>
      </div>

      <button @click="exportToExcel" class="export-btn">
        📊 导出Excel表格
      </button>
      <button @click="downloadAllImages" class="export-btn download-images-btn">
        🖼️ 下载所有图片
      </button>
    </div>

      <!-- 隐藏的Canvas用于图像处理 -->
      <canvas ref="canvas" style="display: none"></canvas>
    </div>

    <!-- 纯图版内容 -->
    <div v-if="currentMode === 'pure-image'" class="pure-image-mode">
      <!-- 步骤1: 上传图片 -->
      <div class="step-section" v-if="pureImageStep === 1">
        <h3>步骤 1/3：上传图片</h3>
        <div class="upload-area">
          <input
            type="file"
            ref="pureImageInput"
            accept="image/*"
            multiple
            @change="handlePureImageUpload"
            style="display: none"
          />
          <button @click="$refs.pureImageInput.click()" class="upload-btn">
            📁 选择图片（可多选）
          </button>
        </div>

        <!-- 图片列表 -->
        <div v-if="pureImages.length > 0" class="image-list">
          <h4>已选择 {{ pureImages.length }} 张图片（拖动调整顺序，点击图片可放大查看）</h4>
          <div class="image-items">
            <div
              v-for="(img, index) in pureImages"
              :key="img.id"
              class="image-item"
              :class="{ 'dragging': draggedIndex === index, 'drag-over': dragOverIndex === index }"
              :data-index="index"
              draggable="true"
              @dragstart="handleDragStart($event, index)"
              @dragenter="handleDragEnter($event, index)"
              @dragover="handleDragOver($event)"
              @dragleave="handleDragLeave($event)"
              @drop="handleDrop($event, index)"
              @dragend="handleDragEnd"
            >
              <div class="image-order">{{ index + 1 }}</div>
              <img :src="img.url" :alt="img.name" @click="showImagePreview(img.url)" />
              <div class="image-name">{{ img.name }}</div>
              <button @click="removeImage(index)" class="remove-btn">✕</button>
            </div>
          </div>
          <button @click="startCropping" class="next-btn">
            下一步：开始裁剪
          </button>
        </div>
      </div>

      <!-- 步骤2: 裁剪图片 -->
      <div class="step-section" v-if="pureImageStep === 2">
        <h3>步骤 2/3：裁剪图片（{{ currentCropIndex + 1 }}/{{ pureImages.length }}）</h3>
        <p class="hint-text">在图片上按住鼠标拖动绘制裁剪框，可以调整框的大小和位置</p>

        <div class="crop-container">
          <!-- 左侧：裁剪编辑区 -->
          <div class="crop-editor">
            <h4>裁剪编辑区</h4>
            <div
              class="crop-canvas-wrapper"
              @mousedown="startDrawingCrop"
            >
              <canvas ref="cropCanvas" class="crop-canvas"></canvas>
              <svg
                class="crop-svg-overlay"
                v-if="cropCanvas"
                :viewBox="`0 0 ${cropCanvasWidth} ${cropCanvasHeight}`"
              >
                <!-- 裁剪框 -->
                <rect
                  v-if="cropRect && cropRect.width > 0"
                  :x="cropRect.x"
                  :y="cropRect.y"
                  :width="cropRect.width"
                  :height="cropRect.height"
                  fill="rgba(64, 158, 255, 0.2)"
                  stroke="#409eff"
                  stroke-width="3"
                  style="pointer-events: none;"
                />
              </svg>
            </div>
            <div class="crop-controls">
              <button @click="clearCropRect" class="control-btn">清除裁剪框</button>
              <button @click="skipCrop" class="control-btn">跳过此图</button>
              <button @click="confirmCrop" class="control-btn primary" :disabled="!cropRect || cropRect.width === 0">
                确认裁剪
              </button>
            </div>
          </div>

          <!-- 右侧：拼接预览 -->
          <div class="crop-preview">
            <h4>拼接预览（点击可放大）</h4>
            <div class="preview-wrapper" @click="showImagePreview(stitchedPreviewUrl)" v-if="stitchedPreviewUrl">
              <img :src="stitchedPreviewUrl" class="preview-image" alt="拼接预览" />
            </div>
            <div class="preview-wrapper empty" v-else>
              <p>裁剪后的图片将在这里显示拼接效果</p>
            </div>
            <div class="preview-info">
              <p v-if="croppedImages.length > 0">已裁剪 {{ croppedImages.length }} 张图片</p>
              <p v-if="cropRect && cropRect.width > 0 && pureImages[currentCropIndex]?.originalImage">
                当前裁剪尺寸：{{ Math.round(cropRect.width * pureImages[currentCropIndex].originalImage.width / cropCanvasWidth) }} × {{ Math.round(cropRect.height * pureImages[currentCropIndex].originalImage.height / cropCanvasHeight) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤3: 预览和导出 -->
      <div class="step-section" v-if="pureImageStep === 3">
        <h3>步骤 3/3：预览和导出</h3>
        <div class="final-preview">
          <h4>拼接预览（点击可放大）</h4>
          <div class="final-image-wrapper" @click="showImagePreview(finalImageUrl)">
            <img :src="finalImageUrl" class="final-image" alt="最终拼接图" />
          </div>
          <div class="export-controls">
            <button @click="backToEdit" class="control-btn">返回编辑</button>
            <button @click="exportFinalImage" class="control-btn primary">💾 导出图片</button>
            <button @click="resetAll" class="control-btn">🔄 重新开始</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 图片预览弹窗 -->
    <div v-if="showPreview" class="image-preview-modal" @click="closePreview">
      <div class="preview-content">
        <img :src="previewImageUrl" alt="预览" />
        <button class="close-preview" @click="closePreview">✕</button>
      </div>
    </div>

    <!-- 隐藏的Canvas用于图像处理 -->
    <canvas ref="canvas" style="display: none"></canvas>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import JSZip from 'jszip'
import ExcelJS from 'exceljs'

// 数据
const currentMode = ref('text-image') // 当前模式：'text-image' 图文版，'pure-image' 纯图版
const fileInput = ref(null)
const uploadedImage = ref(null)
const fileName = ref('')
const canvas = ref(null)
const previewImage = ref(null)
const imageWidth = ref(0)
const imageHeight = ref(0)
const processing = ref(false)
const progress = ref(0)
const progressText = ref('')
const pendingFiles = ref([]) // 待处理的文件列表

// 绘制框相关
const userRect = ref({ x: 0, y: 0, width: 0, height: 0 }) // 用户绘制的第一个框
const isDrawing = ref(false)
const drawStartX = ref(0)
const drawStartY = ref(0)
const horizontalGap = ref(5) // 水平间距
const verticalGap = ref(5) // 垂直间距
const allRects = ref([]) // 所有自动生成的框
const currentFileIndex = ref(0) // 当前处理的文件索引
const enhanceImage = ref(true) // 是否启用图片增强
const hasDrawn = ref(false) // 标记是否已经绘制过框

// 分类相关
const categories = ['生产', '床', '柜子', '桌子', '座椅', '灯具', '电器', '洗浴', '墙饰', '娱乐', '庭院', '摆设', '围墙', '吊饰', '地毯', '地板', '墙', '框架', '门', '窗体', '楼梯', '屋顶', '动力']
const currentCategory = ref('生产') // 当前选中的分类
const furnitureByCategory = ref({}) // 按分类存储家具数据

// 初始化所有分类的数据
categories.forEach(cat => {
  furnitureByCategory.value[cat] = []
})

const furnitureList = ref([]) // 当前分类的家具列表（用于显示）

// OCR 引擎选择
// 默认使用 UMI-OCR（RapidOCR）
const ocrEngine = ref('umi')
// 使用本地 UMI-OCR 服务（更快）
const umiOcrUrl = ref('http://127.0.0.1:1224')

// 纯图版相关数据
const pureImageStep = ref(1) // 当前步骤：1=上传，2=裁剪，3=预览导出
const pureImageInput = ref(null)
const pureImages = ref([]) // 上传的图片列表
const croppedImages = ref([]) // 裁剪后的图片列表
const currentCropIndex = ref(0) // 当前裁剪的图片索引
const cropCanvas = ref(null)
const cropCanvasWidth = ref(0)
const cropCanvasHeight = ref(0)
const cropRect = ref(null) // 裁剪框位置和尺寸
const isDrawingCrop = ref(false)
const cropDrawStartX = ref(0)
const cropDrawStartY = ref(0)
const stitchedPreviewUrl = ref('') // 拼接预览图URL
const finalImageUrl = ref('') // 最终图片URL
const showPreview = ref(false) // 是否显示预览弹窗
const previewImageUrl = ref('') // 预览图片URL
const dragOverIndex = ref(-1) // 拖拽悬停的索引
let imageIdCounter = 0

// 绘制框相关方法
const startDrawing = (e) => {
  // 如果正在绘制中，忽略新的mousedown事件
  if (isDrawing.value) return

  // 如果点击的是SVG rect元素（框），不开始绘制
  if (e.target.tagName === 'rect') return

  // 如果已经绘制过框，不允许再次绘制（除非先清除）
  if (hasDrawn.value) return

  const img = previewImage.value
  if (!img) return

  // 计算图片实际显示尺寸和位置
  const imgRect = img.getBoundingClientRect()
  const scaleX = imageWidth.value / imgRect.width
  const scaleY = imageHeight.value / imgRect.height

  // 计算鼠标在图片上的实际坐标
  drawStartX.value = (e.clientX - imgRect.left) * scaleX
  drawStartY.value = (e.clientY - imgRect.top) * scaleY

  isDrawing.value = true
  userRect.value = { x: drawStartX.value, y: drawStartY.value, width: 0, height: 0 }

  // 添加全局监听，确保即使鼠标移出也能结束绘制
  document.addEventListener('mousemove', onDrawing)
  document.addEventListener('mouseup', endDrawing)
}

const onDrawing = (e) => {
  if (!isDrawing.value) return

  const img = previewImage.value
  if (!img) return

  const imgRect = img.getBoundingClientRect()
  const scaleX = imageWidth.value / imgRect.width
  const scaleY = imageHeight.value / imgRect.height

  const currentX = (e.clientX - imgRect.left) * scaleX
  const currentY = (e.clientY - imgRect.top) * scaleY

  userRect.value = {
    x: Math.min(drawStartX.value, currentX),
    y: Math.min(drawStartY.value, currentY),
    width: Math.abs(currentX - drawStartX.value),
    height: Math.abs(currentY - drawStartY.value)
  }
}

const endDrawing = (e) => {
  if (!isDrawing.value) return

  // 在结束前，使用最终的鼠标位置更新矩形
  const img = previewImage.value
  if (img) {
    const imgRect = img.getBoundingClientRect()
    const scaleX = imageWidth.value / imgRect.width
    const scaleY = imageHeight.value / imgRect.height

    const currentX = (e.clientX - imgRect.left) * scaleX
    const currentY = (e.clientY - imgRect.top) * scaleY

    userRect.value = {
      x: Math.min(drawStartX.value, currentX),
      y: Math.min(drawStartY.value, currentY),
      width: Math.abs(currentX - drawStartX.value),
      height: Math.abs(currentY - drawStartY.value)
    }
  }

  // 移除全局监听
  document.removeEventListener('mousemove', onDrawing)
  document.removeEventListener('mouseup', endDrawing)

  isDrawing.value = false

  // 如果框太小，忽略（但不设置hasDrawn，允许重新绘制）
  if (userRect.value.width < 10 || userRect.value.height < 10) {
    userRect.value = { x: 0, y: 0, width: 0, height: 0 }
    return
  }

  // 只有成功绘制了有效的框，才标记已经绘制过
  hasDrawn.value = true

  // 生成所有框
  generateAllRects()
}

const generateAllRects = () => {
  const rects = []
  const rectWidth = userRect.value.width
  const rectHeight = userRect.value.height
  let startX = userRect.value.x
  let startY = userRect.value.y

  // 向右和向下复制框，直到超出图片边界
  let y = startY
  while (y + rectHeight <= imageHeight.value) {
    let x = startX
    while (x + rectWidth <= imageWidth.value) {
      rects.push({
        x,
        y,
        width: rectWidth,
        height: rectHeight,
        selected: true // 默认选中
      })
      x += rectWidth + horizontalGap.value
    }
    y += rectHeight + verticalGap.value
  }

  allRects.value = rects
}

const clearRect = () => {
  userRect.value = { x: 0, y: 0, width: 0, height: 0 }
  allRects.value = []
  hasDrawn.value = false // 重置绘制标记，允许重新绘制
}

// 切换框的选中状态
const toggleRect = (index) => {
  allRects.value[index].selected = !allRects.value[index].selected
}

// 全选/全不选
const toggleAllRects = () => {
  const allSelected = allRects.value.every(r => r.selected)
  allRects.value.forEach(r => {
    r.selected = !allSelected
  })
}

// 监听间距变化，重新生成框
const updateRects = () => {
  if (userRect.value.width > 0 && userRect.value.height > 0) {
    generateAllRects()
  }
}

// 使用watch监听间距变化
watch([horizontalGap, verticalGap], updateRects)

// 切换模式
const switchMode = (mode) => {
  currentMode.value = mode
}

// ========== 纯图版功能 ==========

// 处理图片上传
const handlePureImageUpload = (event) => {
  const files = Array.from(event.target.files)
  if (files.length === 0) return

  files.forEach(file => {
    const reader = new FileReader()
    reader.onload = (e) => {
      pureImages.value.push({
        id: imageIdCounter++,
        name: file.name,
        url: e.target.result,
        originalImage: null
      })
    }
    reader.readAsDataURL(file)
  })
}

// 移除图片
const removeImage = (index) => {
  pureImages.value.splice(index, 1)
}

// 拖拽开始
let draggedIndex = -1
const handleDragStart = (e, index) => {
  draggedIndex = index
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', index.toString())
}

// 拖拽进入
const handleDragEnter = (e, index) => {
  e.preventDefault()
  if (draggedIndex !== -1 && draggedIndex !== index) {
    dragOverIndex.value = index
  }
}

// 拖拽经过
const handleDragOver = (e) => {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  return false
}

// 拖拽离开
const handleDragLeave = (e) => {
  // 只有当真正离开元素时才清除高亮
  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX
  const y = e.clientY

  if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
    // 鼠标真的离开了元素
    if (dragOverIndex.value === parseInt(e.currentTarget.dataset.index)) {
      dragOverIndex.value = -1
    }
  }
}

// 拖拽放下
const handleDrop = (e, index) => {
  e.preventDefault()
  e.stopPropagation()

  dragOverIndex.value = -1

  if (draggedIndex === -1 || draggedIndex === index) {
    return false
  }

  // 执行交换
  const draggedItem = pureImages.value[draggedIndex]
  pureImages.value.splice(draggedIndex, 1)
  pureImages.value.splice(index, 0, draggedItem)

  return false
}

// 拖拽结束
const handleDragEnd = (e) => {
  draggedIndex = -1
  dragOverIndex.value = -1
}

// 显示图片预览
const showImagePreview = (url) => {
  if (!url) return
  previewImageUrl.value = url
  showPreview.value = true
}

// 关闭预览
const closePreview = () => {
  showPreview.value = false
  previewImageUrl.value = ''
}

// 开始裁剪
const startCropping = () => {
  if (pureImages.value.length === 0) return

  pureImageStep.value = 2
  currentCropIndex.value = 0
  croppedImages.value = []
  stitchedPreviewUrl.value = ''

  // 延迟加载第一张图片，确保DOM已渲染
  setTimeout(() => {
    loadImageForCrop(0)
  }, 100)
}

// 加载图片到裁剪画布
const loadImageForCrop = (index) => {
  const img = new Image()
  img.onload = () => {
    pureImages.value[index].originalImage = img

    const canvas = cropCanvas.value
    const ctx = canvas.getContext('2d')

    // 限制显示尺寸，但保持原始比例
    const maxDisplayWidth = 800
    const maxDisplayHeight = 600

    let displayWidth = img.width
    let displayHeight = img.height

    // 如果图片太大，按比例缩小显示
    if (displayWidth > maxDisplayWidth || displayHeight > maxDisplayHeight) {
      const widthRatio = maxDisplayWidth / displayWidth
      const heightRatio = maxDisplayHeight / displayHeight
      const ratio = Math.min(widthRatio, heightRatio)

      displayWidth = Math.floor(displayWidth * ratio)
      displayHeight = Math.floor(displayHeight * ratio)
    }

    canvas.width = displayWidth
    canvas.height = displayHeight
    cropCanvasWidth.value = displayWidth
    cropCanvasHeight.value = displayHeight

    // 绘制图片（缩放到显示尺寸）
    ctx.drawImage(img, 0, 0, displayWidth, displayHeight)

    // 清空裁剪框
    cropRect.value = null
  }
  img.src = pureImages.value[index].url
}

// 开始绘制裁剪框
const startDrawingCrop = (e) => {
  if (isDrawingCrop.value) return
  if (!cropCanvas.value) return

  const canvas = cropCanvas.value
  const wrapper = canvas.parentElement
  const rect = canvas.getBoundingClientRect()

  // 考虑滚动偏移
  const scrollLeft = wrapper.scrollLeft
  const scrollTop = wrapper.scrollTop

  // 计算鼠标在canvas上的实际坐标（原始像素坐标）
  cropDrawStartX.value = (e.clientX - rect.left) + scrollLeft
  cropDrawStartY.value = (e.clientY - rect.top) + scrollTop

  isDrawingCrop.value = true
  cropRect.value = {
    x: cropDrawStartX.value,
    y: cropDrawStartY.value,
    width: 0,
    height: 0
  }

  document.addEventListener('mousemove', onDrawingCrop)
  document.addEventListener('mouseup', endDrawingCrop)
}

// 绘制裁剪框中
const onDrawingCrop = (e) => {
  if (!isDrawingCrop.value) return

  const canvas = cropCanvas.value
  const wrapper = canvas.parentElement
  const rect = canvas.getBoundingClientRect()

  // 考虑滚动偏移
  const scrollLeft = wrapper.scrollLeft
  const scrollTop = wrapper.scrollTop

  const currentX = (e.clientX - rect.left) + scrollLeft
  const currentY = (e.clientY - rect.top) + scrollTop

  cropRect.value = {
    x: Math.min(cropDrawStartX.value, currentX),
    y: Math.min(cropDrawStartY.value, currentY),
    width: Math.abs(currentX - cropDrawStartX.value),
    height: Math.abs(currentY - cropDrawStartY.value)
  }
}

// 结束绘制裁剪框
const endDrawingCrop = () => {
  if (!isDrawingCrop.value) return

  document.removeEventListener('mousemove', onDrawingCrop)
  document.removeEventListener('mouseup', endDrawingCrop)

  isDrawingCrop.value = false

  // 如果框太小，清除
  if (cropRect.value && (cropRect.value.width < 10 || cropRect.value.height < 10)) {
    cropRect.value = null
  }
}

// 清除裁剪框
const clearCropRect = () => {
  cropRect.value = null
}

// 跳过当前图片
const skipCrop = () => {
  // 检查是否还有图片需要裁剪
  if (currentCropIndex.value < pureImages.value.length - 1) {
    currentCropIndex.value++
    loadImageForCrop(currentCropIndex.value)
  } else {
    // 所有图片处理完成
    if (croppedImages.value.length === 0) {
      alert('没有裁剪任何图片！')
      return
    }
    pureImageStep.value = 3
    setTimeout(() => {
      generateFinalImage()
    }, 100)
  }
}

// 确认裁剪
const confirmCrop = async () => {
  if (!cropRect.value || cropRect.value.width === 0) {
    alert('请先绘制裁剪框！')
    return
  }

  // 获取原始图片
  const originalImg = pureImages.value[currentCropIndex.value].originalImage
  if (!originalImg) {
    alert('原始图片未加载！')
    return
  }

  // 计算缩放比例（原始尺寸 / 显示尺寸）
  const scaleX = originalImg.width / cropCanvasWidth.value
  const scaleY = originalImg.height / cropCanvasHeight.value

  // 计算原始图片上的裁剪区域
  const originalCropX = cropRect.value.x * scaleX
  const originalCropY = cropRect.value.y * scaleY
  const originalCropWidth = cropRect.value.width * scaleX
  const originalCropHeight = cropRect.value.height * scaleY

  // 创建临时canvas进行裁剪（使用原始尺寸）
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = originalCropWidth
  tempCanvas.height = originalCropHeight
  const tempCtx = tempCanvas.getContext('2d')

  // 从原始图片裁剪
  tempCtx.drawImage(
    originalImg,
    originalCropX,
    originalCropY,
    originalCropWidth,
    originalCropHeight,
    0,
    0,
    originalCropWidth,
    originalCropHeight
  )

  const croppedDataUrl = tempCanvas.toDataURL('image/png')
  croppedImages.value.push({
    dataUrl: croppedDataUrl,
    width: originalCropWidth,
    height: originalCropHeight
  })

  // 更新拼接预览
  await updateStitchedPreview()

  // 检查是否还有图片需要裁剪
  if (currentCropIndex.value < pureImages.value.length - 1) {
    currentCropIndex.value++
    loadImageForCrop(currentCropIndex.value)
  } else {
    // 所有图片裁剪完成，进入预览步骤
    pureImageStep.value = 3
    setTimeout(() => {
      generateFinalImage()
    }, 100)
  }
}

// 更新拼接预览
const updateStitchedPreview = () => {
  return new Promise((resolve) => {
    if (croppedImages.value.length === 0) {
      stitchedPreviewUrl.value = ''
      resolve()
      return
    }

    // 找出最大宽度
    let maxWidth = 0
    croppedImages.value.forEach(img => {
      maxWidth = Math.max(maxWidth, img.width)
    })

    // 计算总高度（按比例缩放后的高度）
    let totalHeight = 0
    const scaledImages = croppedImages.value.map(img => {
      const scale = maxWidth / img.width
      const scaledHeight = img.height * scale
      totalHeight += scaledHeight
      return {
        ...img,
        scaledHeight,
        scale
      }
    })

    // 创建临时canvas
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = maxWidth
    tempCanvas.height = totalHeight

    const ctx = tempCanvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, maxWidth, totalHeight)

    // 逐个绘制裁剪后的图片
    let loadedCount = 0
    let currentY = 0

    scaledImages.forEach((img, index) => {
      const image = new Image()

      const yPosition = currentY

      image.onload = () => {
        // 绘制图片，拉伸到统一宽度
        ctx.drawImage(image, 0, yPosition, maxWidth, img.scaledHeight)

        loadedCount++
        if (loadedCount === scaledImages.length) {
          stitchedPreviewUrl.value = tempCanvas.toDataURL('image/png')
          resolve()
        }
      }
      image.src = img.dataUrl

      currentY += img.scaledHeight
    })
  })
}

// 生成最终拼接图片
const generateFinalImage = () => {
  if (croppedImages.value.length === 0) return

  // 找出最大宽度
  let maxWidth = 0
  croppedImages.value.forEach(img => {
    maxWidth = Math.max(maxWidth, img.width)
  })

  // 计算总高度（按比例缩放后的高度）
  let totalHeight = 0
  const scaledImages = croppedImages.value.map(img => {
    const scale = maxWidth / img.width
    const scaledHeight = img.height * scale
    totalHeight += scaledHeight
    return {
      ...img,
      scaledHeight,
      scale
    }
  })

  // 创建临时canvas
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = maxWidth
  tempCanvas.height = totalHeight

  const ctx = tempCanvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, maxWidth, totalHeight)

  // 逐个绘制裁剪后的图片
  let loadedCount = 0
  let currentY = 0

  scaledImages.forEach((img, index) => {
    const image = new Image()

    const yPosition = currentY

    image.onload = () => {
      // 绘制图片，拉伸到统一宽度
      ctx.drawImage(image, 0, yPosition, maxWidth, img.scaledHeight)

      loadedCount++
      if (loadedCount === scaledImages.length) {
        // 所有图片加载完成后，保存最终图片URL
        finalImageUrl.value = tempCanvas.toDataURL('image/png')
      }
    }
    image.src = img.dataUrl

    currentY += img.scaledHeight
  })
}

// 返回编辑
const backToEdit = () => {
  if (croppedImages.value.length === 0) {
    alert('没有可编辑的图片！')
    return
  }

  pureImageStep.value = 2
  currentCropIndex.value = croppedImages.value.length - 1
  croppedImages.value.pop()
  updateStitchedPreview()
  loadImageForCrop(currentCropIndex.value)
}

// 导出最终图片
const exportFinalImage = () => {
  if (!finalImageUrl.value) {
    alert('图片还未生成，请稍候...')
    return
  }

  const link = document.createElement('a')
  link.href = finalImageUrl.value
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  link.download = `拼接图片_${timestamp}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  alert('图片导出成功！')
}

// 重新开始
const resetAll = () => {
  pureImageStep.value = 1
  pureImages.value = []
  croppedImages.value = []
  currentCropIndex.value = 0
  cropRect.value = null
  stitchedPreviewUrl.value = ''
  finalImageUrl.value = ''
}

// ========== 图文版功能 ==========


// 切换分类
const switchCategory = (category) => {
  currentCategory.value = category
  furnitureList.value = furnitureByCategory.value[category]

  // 切换分类时清空图片预览
  uploadedImage.value = null
  fileName.value = ''
}

// 删除单个家具项
const deleteFurnitureItem = (index) => {
  if (confirm('确定要删除这个家具项吗？')) {
    // 从当前显示列表中删除
    furnitureList.value.splice(index, 1)
    // 同步更新分类数据
    furnitureByCategory.value[currentCategory.value] = furnitureList.value
  }
}

// 处理文件上传（支持批量）
const handleFileUpload = (event) => {
  const files = Array.from(event.target.files)
  if (files.length === 0) return

  // 保存所有文件到待处理列表
  pendingFiles.value = files
  currentFileIndex.value = 0

  // 加载第一个文件
  loadFile(files[0])
}

// 加载单个文件
const loadFile = (file) => {
  fileName.value = file.name
  const reader = new FileReader()

  reader.onload = (e) => {
    uploadedImage.value = e.target.result

    // 重置绘制的框
    userRect.value = { x: 0, y: 0, width: 0, height: 0 }
    allRects.value = []
    hasDrawn.value = false // 重置绘制标记

    // 加载图片以获取尺寸
    const img = new Image()
    img.onload = () => {
      imageWidth.value = img.width
      imageHeight.value = img.height

      console.log(`图片尺寸: ${img.width}x${img.height}`)
    }
    img.src = e.target.result
  }

  reader.readAsDataURL(file)
}

// 图片预处理 - 增强清晰度和对比度
const preprocessImage = (sourceCanvas) => {
  const canvas = document.createElement('canvas')
  canvas.width = sourceCanvas.width
  canvas.height = sourceCanvas.height
  const ctx = canvas.getContext('2d')

  // 绘制原图
  ctx.drawImage(sourceCanvas, 0, 0)

  // 获取图像数据
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  // 增强对比度和锐化
  for (let i = 0; i < data.length; i += 4) {
    // 增强对比度（提高文字清晰度）
    const contrast = 1.2 // 对比度增强系数
    data[i] = ((data[i] - 128) * contrast + 128)     // R
    data[i + 1] = ((data[i + 1] - 128) * contrast + 128) // G
    data[i + 2] = ((data[i + 2] - 128) * contrast + 128) // B

    // 限制在0-255范围内
    data[i] = Math.max(0, Math.min(255, data[i]))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1]))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2]))
  }

  // 应用处理后的图像
  ctx.putImageData(imageData, 0, 0)

  return canvas
}

// 智能裁剪 - 检测卡片边界并裁剪
const smartCrop = (sourceCanvas, padding = 2) => {
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true })
  const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
  const data = imageData.data
  const width = sourceCanvas.width
  const height = sourceCanvas.height

  // 判断像素是否为深色（黑色/深灰色条纹）
  const isDark = (r, g, b) => {
    // 提高阈值到120，包含更多深色像素
    return r < 120 && g < 120 && b < 120
  }

  // 判断一行是否主要是深色（超过70%的像素是深色）
  const isRowDark = (y) => {
    let darkCount = 0
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (isDark(data[i], data[i + 1], data[i + 2])) {
        darkCount++
      }
    }
    return darkCount / width > 0.7
  }

  // 判断一列是否主要是深色
  const isColDark = (x) => {
    let darkCount = 0
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4
      if (isDark(data[i], data[i + 1], data[i + 2])) {
        darkCount++
      }
    }
    return darkCount / height > 0.7
  }

  // 从上往下找第一行非深色行
  let topBorder = 0
  for (let y = 0; y < height; y++) {
    if (!isRowDark(y)) {
      topBorder = y
      break
    }
  }

  // 从下往上找最后一行非深色行
  let bottomBorder = height - 1
  for (let y = height - 1; y >= 0; y--) {
    if (!isRowDark(y)) {
      bottomBorder = y
      break
    }
  }

  // 从左往右找第一列非深色列
  let leftBorder = 0
  for (let x = 0; x < width; x++) {
    if (!isColDark(x)) {
      leftBorder = x
      break
    }
  }

  // 从右往左找最后一列非深色列
  let rightBorder = width - 1
  for (let x = width - 1; x >= 0; x--) {
    if (!isColDark(x)) {
      rightBorder = x
      break
    }
  }

  // 计算裁剪比例
  const cropRatio = ((rightBorder - leftBorder) * (bottomBorder - topBorder)) / (width * height)
  console.log(`智能裁剪: 原始=${width}x${height}, 边界=[${leftBorder},${topBorder},${rightBorder},${bottomBorder}], 裁剪比例=${(cropRatio * 100).toFixed(1)}%`)

  // 如果裁剪比例太小（小于20%），说明检测失败，返回原图
  if (cropRatio < 0.2) {
    console.log('智能裁剪: 裁剪区域太小，返回原图')
    return sourceCanvas
  }

  // 如果没有检测到有效区域，返回原图
  if (leftBorder >= rightBorder || topBorder >= bottomBorder) {
    console.log('智能裁剪: 未检测到有效区域，返回原图')
    return sourceCanvas
  }

  // 添加小的padding
  topBorder = Math.max(0, topBorder - padding)
  bottomBorder = Math.min(height - 1, bottomBorder + padding)
  leftBorder = Math.max(0, leftBorder - padding)
  rightBorder = Math.min(width - 1, rightBorder + padding)

  // 计算裁剪后的尺寸
  const cropWidth = rightBorder - leftBorder + 1
  const cropHeight = bottomBorder - topBorder + 1

  // 创建新canvas并裁剪
  const croppedCanvas = document.createElement('canvas')
  croppedCanvas.width = cropWidth
  croppedCanvas.height = cropHeight
  const croppedCtx = croppedCanvas.getContext('2d')

  croppedCtx.drawImage(
    sourceCanvas,
    leftBorder, topBorder, cropWidth, cropHeight,
    0, 0, cropWidth, cropHeight
  )

  console.log(`智能裁剪完成: ${width}x${height} -> ${cropWidth}x${cropHeight}`)
  return croppedCanvas
}

// 使用百度OCR识别图片（通过 Netlify Function 代理）- 带重试机制
const recognizeWithBaidu = async (imageBase64, retryCount = 3) => {
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      // 移除base64前缀
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

      if (attempt > 1) {
        console.log(`第 ${attempt} 次重试...`)
      }

      // 开发环境检测：如果是 5175 端口（Vite 直接访问），使用本地代理
      // 如果是 8888 端口（Netlify Dev），使用 Netlify Functions
      const isViteDirect = window.location.port === '5175'
      const apiUrl = isViteDirect ? 'http://localhost:3000' : '/.netlify/functions/baidu-ocr'

      const requestBody = isViteDirect
        ? {
            apiKey: 'hVUSfUTax1bm4vIsiDRPi1pe',
            secretKey: 'G8gLHV61UjG7ng1Rr3WR3hWrLk1m3Abx',
            image: base64Data
          }
        : { image: base64Data }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('响应数据:', data)

      if (data.error) {
        console.error('百度OCR错误:', data.error_msg)
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }
        return { text: '', confidence: 0, error: true, errorMsg: data.error_msg }
      }

      if (data.error_code) {
        console.error('百度OCR错误:', data.error_msg, '错误码:', data.error_code)

        // 如果是限流错误，等待更长时间后重试
        if (data.error_code === 17 || data.error_code === 18 || data.error_msg?.includes('limit')) {
          if (attempt < retryCount) {
            console.log(`遇到限流，等待 ${3 * attempt} 秒后重试...`)
            await new Promise(resolve => setTimeout(resolve, 3000 * attempt)) // 递增等待时间
            continue
          }
          return { text: '', confidence: 0, error: true, isRateLimit: true, errorMsg: data.error_msg }
        }

        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }
        return { text: '', confidence: 0, error: true, errorMsg: data.error_msg }
      }

      if (data.words_result && data.words_result.length > 0) {
        // 合并所有识别的文字
        const text = data.words_result.map(item => item.words).join(' ')
        console.log('识别成功:', text)
        return { text, confidence: 95 }
      }

      return { text: '', confidence: 0 }
    } catch (error) {
      console.error(`百度OCR识别失败 (尝试 ${attempt}/${retryCount}):`, error.message)
      if (attempt < retryCount) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }
      return { text: '', confidence: 0, error: true, errorMsg: error.message }
    }
  }

  return { text: '', confidence: 0, error: true }
}

// 使用 UMI-OCR 识别图片（本地服务）- 带重试机制
const recognizeWithUmiOCR = async (imageBase64, retryCount = 2) => {
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`第 ${attempt} 次重试...`)
      }

      // 移除 base64 前缀（如果有的话）
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

      // 调用 UMI-OCR API 服务
      // UMI-OCR HTTP API 路径是 /api/ocr
      const response = await fetch(`${umiOcrUrl.value}/api/ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          base64: base64Data
        })
      })

      console.log('收到响应:', response.status, response.statusText)

      if (!response.ok) {
        // 尝试读取错误信息
        const errorText = await response.text()
        console.error('HTTP错误:', response.status, response.statusText, '详情:', errorText)
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }
        return { text: '', confidence: 0, error: true, errorMsg: `HTTP ${response.status}: ${response.statusText}` }
      }

      const data = await response.json()
      console.log('响应数据:', JSON.stringify(data, null, 2))

      // UMI-OCR 返回格式: { code: 100, data: [{text: "...", score: 0.88}] }
      // code: 100 表示成功，101 表示无文字
      if (data.code === 100 && data.data && data.data.length > 0) {
        // 合并所有识别的文字
        const text = data.data.map(item => item.text).join(' ')
        // 计算平均置信度
        const avgScore = data.data.reduce((sum, item) => sum + (item.score || 0), 0) / data.data.length
        const confidence = Math.round(avgScore * 100)

        console.log('识别成功:', text, '置信度:', confidence)
        return { text, confidence }
      }

      // 如果没有识别到文字 (code: 101)
      if (data.code === 101 || (data.data && data.data.length === 0)) {
        console.log('未识别到文字')
        return { text: '', confidence: 0 }
      }

      // 其他错误
      if (data.code !== 100) {
        console.error('UMI-OCR错误 - 完整响应:', JSON.stringify(data, null, 2))
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }
        return { text: '', confidence: 0, error: true, errorMsg: data.message || `错误码: ${data.code}` }
      }

      return { text: '', confidence: 0 }
    } catch (error) {
      console.error(`OCR识别失败 (尝试 ${attempt}/${retryCount}):`, error.message)
      if (attempt < retryCount) {
        await new Promise(resolve => setTimeout(resolve, 500))
        continue
      }
      return { text: '', confidence: 0, error: true, errorMsg: error.message }
    }
  }

  return { text: '', confidence: 0, error: true }
}

// Tesseract识别（作为备选方案）
const fallbackToTesseract = async (worker, cellImage, psmModes, currentCell) => {
  let bestResult = { text: '', confidence: 0, modeName: '' }

  for (const psmMode of psmModes) {
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: psmMode.mode,
        preserve_interword_spaces: '1',
        tessedit_char_blacklist: '|[]()<>@#$%^&*+=~`',
      })

      const { data: { text, confidence: conf } } = await worker.recognize(cellImage)
      console.log(`格子 ${currentCell} [${psmMode.name}]:`, text.trim(), '置信度:', conf)

      if (conf > bestResult.confidence) {
        bestResult = { text: text.trim(), confidence: conf, modeName: psmMode.name }
      }
    } catch (error) {
      console.error(`识别失败 [${psmMode.name}]:`, error)
    }
  }

  console.log(`格子 ${currentCell} 最佳结果 [${bestResult.modeName}]:`, bestResult.text, '置信度:', bestResult.confidence)

  const parsed = parseText(bestResult.text)
  return {
    name: parsed.name,
    quantity: parsed.quantity,
    confidence: Math.round(bestResult.confidence) + '%'
  }
}

// 处理图像 - 自动识别模式
const processImage = async () => {
  if (!uploadedImage.value) return

  if (allRects.value.length === 0) {
    alert('请先在图片上绘制第一个框！\n\n在第一个家具上按住鼠标拖动绘制红色框，系统会自动生成所有框。')
    return
  }

  processing.value = true
  progress.value = 0
  progressText.value = '正在切割图片...'
  furnitureList.value = [] // 清空当前显示列表

  try {
    // 加载图片
    progressText.value = '正在加载图片...'
    const img = new Image()
    img.src = uploadedImage.value

    await new Promise((resolve) => {
      img.onload = resolve
    })

    // 设置Canvas
    const ctx = canvas.value.getContext('2d')
    canvas.value.width = img.width
    canvas.value.height = img.height
    ctx.drawImage(img, 0, 0)

    progressText.value = '正在切割和识别图片...'

    // 只处理选中的框
    const selectedRects = allRects.value.filter(rect => rect.selected)
    const totalCells = selectedRects.length

    if (totalCells === 0) {
      alert('没有选中任何框！\n\n请确保至少有一个绿色框（选中状态）。')
      processing.value = false
      return
    }

    for (let i = 0; i < selectedRects.length; i++) {
      const rect = selectedRects[i]

      // 更新进度
      const currentCell = i + 1
      progressText.value = `正在识别第 ${currentCell}/${totalCells} 个家具...`

      // 创建临时Canvas切割图片，放大4倍提高显示质量
      const scale = 4

      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = rect.width * scale
      tempCanvas.height = rect.height * scale
      const tempCtx = tempCanvas.getContext('2d')

      // 使用高质量缩放
      tempCtx.imageSmoothingEnabled = true
      tempCtx.imageSmoothingQuality = 'high'

      tempCtx.drawImage(
        canvas.value,
        rect.x, rect.y, rect.width, rect.height,
        0, 0, rect.width * scale, rect.height * scale
      )

      // 如果启用了图片增强，应用增强处理
      let finalCanvas = tempCanvas
      if (enhanceImage.value) {
        finalCanvas = preprocessImage(tempCanvas)
      }

      // 使用 PNG 格式保持最高质量
      const cellImage = finalCanvas.toDataURL('image/png')

      // 根据选择的引擎调用不同的识别函数，失败时自动重试
      let result
      let retryCount = 2 // 减少重试次数到2次
      let name = ''
      let quantity = ''

      for (let retry = 0; retry < retryCount; retry++) {
        if (retry > 0) {
          console.log(`格子 ${currentCell} 第 ${retry + 1} 次尝试识别...`)
          await new Promise(resolve => setTimeout(resolve, 300)) // 减少重试等待时间到300ms
        }

        if (ocrEngine.value === 'umi') {
          result = await recognizeWithUmiOCR(cellImage)
          console.log(`格子 ${currentCell} [UMI-OCR]:`, result.text, '置信度:', result.confidence)
        } else {
          result = await recognizeWithBaidu(cellImage)
          console.log(`格子 ${currentCell} [百度OCR]:`, result.text, '置信度:', result.confidence)
        }

        // 如果遇到限流错误，提示用户并停止
        if (result.isRateLimit) {
          alert(`百度OCR请求限制：${result.errorMsg}\n\n可能原因：\n1. 达到QPS限制（每秒请求次数）\n2. 达到每日调用次数限制\n3. 账户配额不足\n\n建议：\n- 检查百度控制台的配额使用情况\n- 增加请求间隔时间\n- 联系百度客服确认账户状态`)
          processing.value = false
          return
        }

        // 如果遇到连接错误，提示用户检查配置
        if (result.error && result.errorMsg) {
          if (result.errorMsg.includes('Failed to fetch') || result.errorMsg.includes('NetworkError') || result.errorMsg.includes('HTTP')) {
            const engineName = ocrEngine.value === 'umi' ? 'RapidOCR' : '百度OCR'
            const errorTips = ocrEngine.value === 'umi'
              ? `\n\n可能原因：\n1. RapidOCR 服务未启动或正在休眠（Render 免费版会休眠）\n2. 服务地址配置错误（当前：${umiOcrUrl.value}）\n3. 网络连接问题\n\n解决方法：\n- 等待 30-60 秒让服务唤醒\n- 检查服务地址是否正确\n- 访问 ${umiOcrUrl.value} 测试服务是否可用`
              : `\n\n可能原因：\n1. 网络连接问题\n2. API Key 或 Secret Key 配置错误\n3. 百度账户配额不足\n\n请检查您的配置并重试。`

            alert(`无法连接到${engineName}服务！\n\n错误信息：${result.errorMsg}${errorTips}`)
            processing.value = false
            return
          }
        }

        // 尝试解析识别结果
        if (result.text && !result.error) {
          const parsed = parseText(result.text)
          name = parsed.name
          quantity = parsed.quantity

          // 如果成功识别到名称，跳出重试循环
          if (name && name.trim() !== '') {
            break
          }
        }
      }

      // 重试多次后仍然失败，询问用户
      if (!name || name.trim() === '') {
        const userChoice = confirm(
          `格子 ${currentCell} 重试 ${retryCount} 次后仍未识别到名称\n\n` +
          `最后识别结果：${result.text || '(空)'}\n` +
          `置信度：${result.confidence}%\n\n` +
          `点击"确定"继续识别下一个\n` +
          `点击"取消"停止识别，手动编辑当前结果`
        )

        if (!userChoice) {
          // 用户选择停止，保存当前结果
          furnitureList.value.push({
            image: cellImage,
            name: name || '',
            quantity: quantity || '',
            price: '',
            confidence: result.confidence + '%',
            category: currentCategory.value
          })

          processing.value = false
          progressText.value = `已停止识别，共识别 ${currentCell} 个格子`
          progress.value = (currentCell / totalCells) * 100
          return
        }
      }

      furnitureList.value.push({
        image: cellImage,
        name: name || '',
        quantity: quantity || '',
        price: '',
        confidence: result.confidence + '%',
        category: currentCategory.value // 添加分类标记
      })

      progress.value = (currentCell / totalCells) * 100

      // 添加小延迟避免触发QPS限制（本地服务可以更快）
      if (currentCell < totalCells) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }

    // 保存到对应分类（追加，不覆盖）
    furnitureByCategory.value[currentCategory.value] = [
      ...furnitureByCategory.value[currentCategory.value],
      ...furnitureList.value
    ]
    // 更新当前显示列表
    furnitureList.value = furnitureByCategory.value[currentCategory.value]

    // 检查是否还有待处理的文件
    currentFileIndex.value++
    if (currentFileIndex.value < pendingFiles.value.length) {
      // 还有文件待处理，加载下一个但不自动识别
      progressText.value = `第 ${currentFileIndex.value}/${pendingFiles.value.length} 张图片识别完成，已加载下一张`
      progress.value = 100

      // 延迟1秒后加载下一张
      setTimeout(() => {
        loadFile(pendingFiles.value[currentFileIndex.value])
        processing.value = false // 停止处理状态，等待用户确认
        alert(`第 ${currentFileIndex.value}/${pendingFiles.value.length} 张图片已加载\n\n请绘制框并调整间距，然后点击"开始识别"按钮`)
      }, 1000)
    } else {
      // 所有文件处理完成
      progressText.value = `全部完成！共处理 ${pendingFiles.value.length} 张图片`
      progress.value = 100
      pendingFiles.value = [] // 清空待处理列表
      currentFileIndex.value = 0
      processing.value = false
    }

  } catch (error) {
    console.error('处理失败:', error)
    alert('处理失败: ' + error.message)
    processing.value = false
  }
}

// 解析文字，提取名称和数量（增强版）
const parseText = (text) => {
  if (!text) return { name: '', quantity: '' }

  // 保存原始文本用于调试
  const originalText = text

  // 移除所有空白字符和换行，但保留一个空格
  text = text.replace(/\s+/g, ' ').trim()

  console.log('解析文本:', text)

  let quantity = ''
  let name = text

  // 优先级从高到低的匹配模式
  const patterns = [
    // 模式1: x数字 或 ×数字 或 *数字 (最常见的格式)
    { regex: /[xX×*]\s*(\d+)/g, priority: 1 },

    // 模式2: 数字+量词 (如: 2个, 3件, 4张, 5条)
    { regex: /(\d+)\s*[个件张条台把支只盒箱]/g, priority: 2 },

    // 模式3: 数量: 或 数量： (明确标注)
    { regex: /[数量]\s*[:：]\s*(\d+)/g, priority: 3 },

    // 模式4: 单独的数字在末尾
    { regex: /\s+(\d+)$/g, priority: 4 },

    // 模式5: 单独的数字在开头
    { regex: /^(\d+)\s+/g, priority: 5 },
  ]

  // 按优先级尝试匹配
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern.regex)]

    if (matches.length > 0) {
      // 如果有多个匹配，取最后一个（通常数量在后面）
      const match = matches[matches.length - 1]
      quantity = match[1]

      // 从文本中移除数量部分
      name = text.replace(match[0], ' ').trim()

      console.log(`匹配成功 [优先级${pattern.priority}]:`, '数量=', quantity, '名称=', name)
      break
    }
  }

  // 如果还是没有匹配到数量，尝试提取所有数字
  if (!quantity) {
    const numbers = text.match(/\d+/g)
    if (numbers && numbers.length > 0) {
      // 过滤掉可能是名称一部分的数字（如"3D打印机"中的3）
      // 如果数字后面紧跟字母，可能是名称的一部分
      const validNumbers = numbers.filter((num, index) => {
        const numIndex = text.indexOf(num)
        const nextChar = text[numIndex + num.length]
        // 如果数字后面是字母或D，可能是名称的一部分
        return !(nextChar && /[a-zA-Z]/.test(nextChar))
      })

      if (validNumbers.length > 0) {
        // 取最后一个有效数字作为数量
        quantity = validNumbers[validNumbers.length - 1]
        name = text.replace(new RegExp(`\\b${quantity}\\b`), '').trim()
        console.log('提取数字作为数量:', '数量=', quantity, '名称=', name)
      }
    }
  }

  // 清理名称中的特殊字符和多余空格
  name = name.replace(/[xX×*:：]/g, ' ')
               .replace(/\s+/g, ' ')
               .trim()

  // 如果名称为空，使用原文本
  if (!name) {
    name = originalText.replace(/[xX×*:：\d]/g, '').trim()
  }

  // 如果数量为空，默认为1
  if (!quantity && name) {
    quantity = '1'
    console.log('未找到数量，默认设为1')
  }

  console.log('最终解析结果 - 名称:', name, '数量:', quantity)

  return { name, quantity }
}

// 导出Excel（按分类，每个分类独立表头）
const exportToExcel = async () => {
  // 检查是否有数据
  const hasData = categories.some(cat => furnitureByCategory.value[cat].length > 0)
  if (!hasData) {
    alert('没有数据可导出！请先上传并识别家具图片。')
    return
  }

  try {
    // 创建工作簿
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('家具清单')

    const itemsPerRow = 4 // 每行4个产品
    const colsPerItem = 4 // 每个产品占4列（图片、名字、数量、单价）

    // 设置列宽
    for (let i = 0; i < itemsPerRow; i++) {
      const startCol = i * colsPerItem
      worksheet.getColumn(startCol + 1).width = 12 // 图片列
      worksheet.getColumn(startCol + 2).width = 18 // 名字列
      worksheet.getColumn(startCol + 3).width = 7  // 数量列
      worksheet.getColumn(startCol + 4).width = 7  // 单价列
    }

    let currentRow = 1 // 当前行号

    // 遍历所有分类
    for (const category of categories) {
      const items = furnitureByCategory.value[category]
      if (items.length === 0) continue // 跳过空分类

      // 添加分类标题行
      const categoryTitleRow = worksheet.getRow(currentRow)
      categoryTitleRow.height = 25
      categoryTitleRow.getCell(1).value = category
      categoryTitleRow.getCell(1).font = {
        size: 12,
        bold: true,
        name: '微软雅黑',
        color: { argb: 'FF333333' } // 深灰色字体
      }
      categoryTitleRow.getCell(1).alignment = {
        vertical: 'middle',
        horizontal: 'center' // 居中对齐
      }
      categoryTitleRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD6EAF8' } // 淡蓝色背景
      }
      // 移除边框
      // 合并分类标题行的所有列
      worksheet.mergeCells(currentRow, 1, currentRow, itemsPerRow * colsPerItem)
      currentRow++

      // 添加表头行
      const headerRow = worksheet.getRow(currentRow)
      headerRow.height = 20
      headerRow.font = { size: 10, bold: true, name: '微软雅黑' }
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

      // 为每个产品位置添加表头
      for (let i = 0; i < itemsPerRow; i++) {
        const startCol = i * colsPerItem + 1
        headerRow.getCell(startCol).value = '图片'
        headerRow.getCell(startCol + 1).value = '名称'
        headerRow.getCell(startCol + 2).value = '数量'
        headerRow.getCell(startCol + 3).value = '单价'

        // 设置表头样式
        for (let j = 0; j < colsPerItem; j++) {
          const cell = headerRow.getCell(startCol + j)
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE7E6E6' }
          }
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
        }
      }
      currentRow++

      // 计算需要多少行
      const totalRows = Math.ceil(items.length / itemsPerRow)

      // 添加数据行
      for (let rowIdx = 0; rowIdx < totalRows; rowIdx++) {
        const dataRow = worksheet.getRow(currentRow)
        dataRow.height = 40 // 行高

        // 在这一行中添加最多4个产品
        for (let colIdx = 0; colIdx < itemsPerRow; colIdx++) {
          const itemIndex = rowIdx * itemsPerRow + colIdx
          if (itemIndex >= items.length) break

          const item = items[itemIndex]
          const startCol = colIdx * colsPerItem + 1

          // 填充数据
          dataRow.getCell(startCol).value = '' // 图片列留空
          dataRow.getCell(startCol + 1).value = item.name || ''
          dataRow.getCell(startCol + 2).value = item.quantity || ''
          dataRow.getCell(startCol + 3).value = item.price || ''

          // 设置单元格样式
          for (let j = 0; j < colsPerItem; j++) {
            const cell = dataRow.getCell(startCol + j)
            cell.font = { size: 10, name: '微软雅黑' } // 增加字体大小
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            }
          }

          // 添加图片 - 完全填充单元格
          try {
            const base64Data = item.image.split(',')[1]
            const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

            const imageId = workbook.addImage({
              buffer: imageBuffer,
              extension: 'png'
            })

            const imageCol = startCol - 1
            const imageRow = currentRow - 1 // ExcelJS行号从0开始

            // 完全填充单元格：从左上角到右下角
            worksheet.addImage(imageId, {
              tl: { col: imageCol, row: imageRow }, // 左上角对齐
              br: { col: imageCol + 1, row: imageRow + 1 }, // 右下角对齐
              editAs: 'oneCell'
            })
          } catch (error) {
            console.error(`添加图片失败:`, error)
          }
        }
        currentRow++
      }

      // 分类之间添加空行
      currentRow++
    }

    // 生成Excel文件
    const buffer = await workbook.xlsx.writeBuffer()

    // 创建下载链接
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    link.download = `家具清单_${timestamp}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // 释放URL对象
    URL.revokeObjectURL(link.href)

    alert('Excel导出成功！\n\n✨ 已按分类导出，每个分类有独立表头')
  } catch (error) {
    console.error('导出失败:', error)
    alert('导出失败: ' + error.message)
  }
}

// 下载所有切好的图片（打包成zip）
const downloadAllImages = async () => {
  if (furnitureList.value.length === 0) return

  try {
    // 创建zip对象
    const zip = new JSZip()
    const folder = zip.folder('家具图片')

    // 将所有图片添加到zip中
    furnitureList.value.forEach((item, index) => {
      // 从base64数据中提取图片数据
      const base64Data = item.image.split(',')[1]
      folder.file(`家具_${index + 1}.png`, base64Data, { base64: true })
    })

    // 生成zip文件
    progressText.value = '正在打包图片...'
    processing.value = true

    const content = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    })

    // 创建下载链接
    const link = document.createElement('a')
    link.href = URL.createObjectURL(content)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    link.download = `家具图片_${timestamp}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // 释放URL对象
    URL.revokeObjectURL(link.href)

    processing.value = false
    alert(`成功打包 ${furnitureList.value.length} 张图片！\n\n图片已保存在zip文件中的"家具图片"文件夹内`)
  } catch (error) {
    console.error('打包失败:', error)
    processing.value = false
    alert('打包失败: ' + error.message)
  }
}
</script>

<style scoped>
.furniture-processor {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Microsoft YaHei', Arial, sans-serif;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

/* 模式切换 */
.mode-tabs {
  display: flex;
  justify-content: center;
  gap: 0;
  margin-bottom: 30px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.mode-tab {
  flex: 1;
  padding: 15px 30px;
  border: none;
  background: #f5f5f5;
  color: #666;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.mode-tab:first-child {
  border-right: 1px solid #e0e0e0;
}

.mode-tab:hover {
  background: #e8e8e8;
  color: #333;
}

.mode-tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.mode-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 3px;
  background: white;
  border-radius: 2px 2px 0 0;
}

h3 {
  color: #555;
  margin: 20px 0;
}

/* 分类选择区域 */
.category-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 15px;
}

.category-tab {
  padding: 10px 20px;
  border: 2px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
  position: relative;
}

.category-tab:hover {
  border-color: #409eff;
  color: #409eff;
}

.category-tab.active {
  background: #409eff;
  color: white;
  border-color: #409eff;
}

.count-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  background: #67c23a;
  color: white;
  border-radius: 10px;
  font-size: 12px;
  font-weight: bold;
}

.category-tab.active .count-badge {
  background: white;
  color: #409eff;
}

/* API配置区域 */
.api-config-section {
  margin-bottom: 30px;
  border: 2px solid #409eff;
  border-radius: 8px;
  overflow: hidden;
}

.api-config-section details {
  background: #f0f9ff;
}

.api-config-section summary {
  padding: 15px 20px;
  cursor: pointer;
  font-weight: bold;
  color: #409eff;
  user-select: none;
  transition: background 0.3s;
}

.api-config-section summary:hover {
  background: #e6f4ff;
}

.config-content {
  padding: 20px;
  background: white;
  border-top: 1px solid #d9ecff;
}

.config-tip {
  margin-bottom: 15px;
  padding: 10px;
  background: #fff7e6;
  border-left: 4px solid #faad14;
  color: #666;
  line-height: 1.6;
}

.config-tip a {
  color: #409eff;
  text-decoration: none;
  font-weight: bold;
}

.config-tip a:hover {
  text-decoration: underline;
}

.config-inputs {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.config-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.config-group label {
  min-width: 100px;
  font-weight: bold;
  color: #555;
}

.config-group input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.config-status {
  margin-top: 15px;
  padding: 10px;
  background: #f6ffed;
  border-left: 4px solid #52c41a;
  color: #52c41a;
  font-weight: bold;
}

/* 上传区域 */
.upload-section {
  text-align: center;
  margin-bottom: 30px;
}

.upload-btn {
  background: #409eff;
  color: white;
  border: none;
  padding: 12px 30px;
  font-size: 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.upload-btn:hover {
  background: #66b1ff;
}

.file-name {
  margin-left: 15px;
  color: #666;
}

.pending-info {
  margin-left: 15px;
  color: #409eff;
  font-size: 14px;
  font-weight: bold;
}

/* 预览区域 */
.preview-section {
  margin-bottom: 30px;
}

.image-container {
  position: relative;
  display: inline-block;
  margin-bottom: 20px;
}

.preview-image {
  max-width: 100%;
  border: 2px solid #ddd;
  border-radius: 4px;
  display: block;
}

.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* 移除 pointer-events: none，让绿色框可以接收点击事件 */
}

.usage-tips {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 15px 20px;
  border-radius: 8px;
  margin: 15px 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.usage-tips strong {
  font-size: 16px;
  display: block;
  margin-bottom: 10px;
}

.usage-tips ul {
  margin: 0;
  padding-left: 20px;
  list-style: none;
}

.usage-tips li {
  margin: 8px 0;
  line-height: 1.6;
  font-size: 14px;
}

.controls {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-group label {
  font-weight: bold;
  color: #555;
}

.control-group input {
  width: 80px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.hint-text {
  font-size: 12px;
  color: #999;
  font-style: italic;
}

.process-btn {
  background: #67c23a;
  color: white;
  border: none;
  padding: 10px 25px;
  font-size: 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.process-btn:hover {
  background: #85ce61;
}

.process-btn.manual {
  background: #409eff;
}

.process-btn.manual:hover {
  background: #66b1ff;
}

.clear-btn {
  background: #f56c6c;
  color: white;
  border: none;
  padding: 10px 25px;
  font-size: 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.clear-btn:hover {
  background: #f78989;
}

.toggle-btn {
  background: #409eff;
  color: white;
  border: none;
  padding: 10px 25px;
  font-size: 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
  margin-left: 10px;
}

.toggle-btn:hover {
  background: #66b1ff;
}

/* 进度条 */
.progress-section {
  margin: 30px 0;
}

.progress-bar {
  width: 100%;
  height: 30px;
  background: #f0f0f0;
  border-radius: 15px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #67c23a);
  transition: width 0.3s;
}

.progress-section p {
  text-align: center;
  color: #666;
  font-size: 14px;
}

/* 结果区域 */
.results-section {
  margin-top: 30px;
}

.furniture-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.furniture-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background: #f9f9f9;
  transition: box-shadow 0.3s;
  position: relative;
}

.furniture-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.delete-item-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #f56c6c;
  color: white;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  opacity: 0;
}

.furniture-item:hover .delete-item-btn {
  opacity: 1;
}

.delete-item-btn:hover {
  background: #f78989;
  transform: scale(1.1);
}

.furniture-thumb {
  width: 100%;
  height: 150px;
  object-fit: contain;
  background: white;
  border-radius: 4px;
  margin-bottom: 10px;
}

.furniture-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.furniture-info input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.input-name {
  font-weight: bold;
}

.input-quantity,
.input-price {
  width: 100%;
}

.export-btn {
  display: block;
  margin: 0 auto;
  background: #e6a23c;
  color: white;
  border: none;
  padding: 12px 40px;
  font-size: 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.export-btn:hover {
  background: #ebb563;
}

.download-images-btn {
  background: #909399;
  margin-left: 15px;
}

.download-images-btn:hover {
  background: #a6a9ad;
}

/* ========== 纯图版样式 ========== */
.pure-image-mode {
  max-width: 1400px;
  margin: 0 auto;
}

.step-section {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.step-section h3 {
  color: #409eff;
  margin-bottom: 20px;
  font-size: 20px;
}

.step-section h4 {
  color: #666;
  margin-bottom: 15px;
  font-size: 16px;
}

/* 图片列表 */
.image-list {
  margin-top: 30px;
}

.image-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.image-item {
  position: relative;
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  background: #f9f9f9;
  cursor: move;
  transition: all 0.3s;
}

.image-item:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.image-item.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.image-item.drag-over {
  border-color: #67c23a;
  background: #f0f9ff;
  box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.3);
  transform: scale(1.05);
}

.image-order {
  position: absolute;
  top: 5px;
  left: 5px;
  background: #409eff;
  color: white;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
  z-index: 10;
}

.image-item img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.image-item img:hover {
  transform: scale(1.05);
}

.image-name {
  font-size: 12px;
  color: #666;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  background: #f56c6c;
  color: white;
  border: none;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: background 0.3s;
}

.remove-btn:hover {
  background: #f78989;
}

.next-btn {
  display: block;
  margin: 20px auto 0;
  background: #67c23a;
  color: white;
  border: none;
  padding: 12px 40px;
  font-size: 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.next-btn:hover {
  background: #85ce61;
}

/* 裁剪容器 */
.crop-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-top: 20px;
}

.crop-editor,
.crop-preview {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
}

.crop-canvas-wrapper {
  position: relative;
  background: #fff;
  border: 2px solid #ddd;
  border-radius: 4px;
  overflow: auto;
  margin-bottom: 15px;
  cursor: crosshair;
  max-height: 600px;
}

.crop-canvas {
  display: block;
}

.crop-svg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.crop-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.control-btn {
  background: #909399;
  color: white;
  border: none;
  padding: 10px 25px;
  font-size: 14px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.control-btn:hover {
  background: #a6a9ad;
}

.control-btn.primary {
  background: #409eff;
}

.control-btn.primary:hover {
  background: #66b1ff;
}

.preview-wrapper {
  background: #fff;
  border: 2px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  min-height: 200px;
  max-height: 500px;
  overflow-y: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
  cursor: pointer;
  transition: border-color 0.3s;
}

.preview-wrapper:hover {
  border-color: #409eff;
}

.preview-wrapper.empty {
  cursor: default;
  color: #999;
  font-style: italic;
}

.preview-wrapper.empty:hover {
  border-color: #ddd;
}

.preview-image {
  max-width: 100%;
  display: block;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-canvas {
  max-width: 100%;
  display: block;
}

.preview-info {
  text-align: center;
  color: #666;
  font-size: 14px;
}

/* 最终预览 */
.final-preview {
  text-align: center;
}

.final-image-wrapper {
  background: #f9f9f9;
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  max-height: 600px;
  overflow-y: auto;
  cursor: pointer;
  transition: border-color 0.3s;
}

.final-image-wrapper:hover {
  border-color: #409eff;
}

.final-image {
  max-width: 100%;
  display: block;
  margin: 0 auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.final-canvas {
  max-width: 100%;
  display: block;
  margin: 0 auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.export-controls {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
}

/* 图片预览弹窗 */
.image-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: pointer;
}

.preview-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-content img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.close-preview {
  position: absolute;
  top: -40px;
  right: 0;
  background: #f56c6c;
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  transition: background 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.close-preview:hover {
  background: #f78989;
}

/* 引擎选择器样式 */
.engine-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.engine-select:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}

.engine-select:hover {
  border-color: #409eff;
}
</style>
