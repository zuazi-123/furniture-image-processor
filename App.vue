<template>
  <div>
    <!-- 未登录显示登录页面 -->
    <Login v-if="!isAuthenticated" @login-success="handleLoginSuccess" />

    <!-- 已登录显示主应用 -->
    <div v-else>
      <FurnitureProcessor />
      <button @click="handleLogout" class="logout-btn" title="退出登录">
        🚪 退出
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Login from './Login.vue'
import FurnitureProcessor from './index.vue'

const isAuthenticated = ref(false)

// 检查是否已登录
const checkAuth = () => {
  const authData = localStorage.getItem('furniture_auth')

  if (authData) {
    try {
      const { expire } = JSON.parse(authData)

      // 检查是否过期
      if (Date.now() < expire) {
        isAuthenticated.value = true
        return
      } else {
        // 已过期，清除数据
        localStorage.removeItem('furniture_auth')
      }
    } catch (error) {
      localStorage.removeItem('furniture_auth')
    }
  }

  isAuthenticated.value = false
}

// 登录成功处理
const handleLoginSuccess = () => {
  isAuthenticated.value = true
}

// 退出登录
const handleLogout = () => {
  if (confirm('确定要退出登录吗？')) {
    localStorage.removeItem('furniture_auth')
    isAuthenticated.value = false
  }
}

// 页面加载时检查登录状态
onMounted(() => {
  checkAuth()
})
</script>

<style scoped>
.logout-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 10px 20px;
  background: rgba(245, 108, 108, 0.9);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.logout-btn:hover {
  background: rgba(245, 108, 108, 1);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}
</style>
