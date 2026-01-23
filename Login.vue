<template>
  <div class="login-container">
    <div class="login-box">
      <h1>🔒 家具图片处理工具</h1>
      <p class="subtitle">请输入访问密码</p>

      <div class="input-group">
        <input
          v-model="password"
          type="password"
          placeholder="请输入密码"
          @keyup.enter="handleLogin"
          :disabled="isLoading"
          class="password-input"
        />
        <button @click="handleLogin" :disabled="isLoading" class="login-btn">
          <span v-if="!isLoading">登录</span>
          <span v-else>登录中...</span>
        </button>
      </div>

      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

      <div class="hint">
        <p>💡 提示：如需获取访问权限，请联系管理员</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const password = ref('')
const errorMsg = ref('')
const isLoading = ref(false)

const emit = defineEmits(['login-success'])

const handleLogin = async () => {
  errorMsg.value = ''

  if (!password.value) {
    errorMsg.value = '请输入密码'
    return
  }

  isLoading.value = true

  try {
    // 调用认证 API
    const response = await fetch('/.netlify/functions/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'login',
        password: password.value
      })
    })

    const data = await response.json()

    if (response.ok && data.success) {
      // 登录成功，保存认证信息
      localStorage.setItem('furniture_auth', JSON.stringify({
        password: password.value,
        expireTime: data.expireTime
      }))

      emit('login-success')
    } else {
      errorMsg.value = data.error || '登录失败，请重试'
      password.value = ''
    }
  } catch (error) {
    console.error('登录错误:', error)
    errorMsg.value = '网络错误，请检查连接后重试'
  } finally {
    isLoading.value = false
  }
}

// 页面加载时检查是否已登录
onMounted(async () => {
  const authData = localStorage.getItem('furniture_auth')
  if (authData) {
    try {
      const { expireTime } = JSON.parse(authData)

      // 检查是否过期
      if (expireTime && expireTime > Date.now()) {
        emit('login-success')
      } else {
        // 已过期，清除本地存储
        localStorage.removeItem('furniture_auth')
      }
    } catch (error) {
      console.error('验证错误:', error)
      localStorage.removeItem('furniture_auth')
    }
  }
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-box {
  background: white;
  border-radius: 16px;
  padding: 50px 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 450px;
  width: 100%;
  text-align: center;
}

h1 {
  color: #333;
  margin-bottom: 10px;
  font-size: 28px;
}

.subtitle {
  color: #666;
  margin-bottom: 30px;
  font-size: 16px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.password-input {
  padding: 15px 20px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s;
  outline: none;
}

.password-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.login-btn {
  padding: 15px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.login-btn:active {
  transform: translateY(0);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.password-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.error-msg {
  color: #f56c6c;
  font-size: 14px;
  margin-top: -10px;
  margin-bottom: 10px;
  animation: shake 0.5s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.hint {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.hint p {
  color: #999;
  font-size: 14px;
  line-height: 1.6;
}
</style>
