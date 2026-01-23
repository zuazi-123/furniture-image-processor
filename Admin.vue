<template>
  <div class="admin-container">
    <!-- 管理员登录 -->
    <div v-if="!isAdminLoggedIn" class="admin-login">
      <div class="login-box">
        <h1>🔐 管理员后台</h1>
        <div class="input-group">
          <input
            v-model="adminPassword"
            type="password"
            placeholder="请输入管理员密码"
            @keyup.enter="handleAdminLogin"
            class="admin-input"
          />
          <button @click="handleAdminLogin" class="admin-btn">登录</button>
        </div>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      </div>
    </div>

    <!-- 管理后台 -->
    <div v-else class="admin-panel">
      <div class="admin-header">
        <h1>📊 IP 管理后台</h1>
        <button @click="handleLogout" class="logout-btn">退出</button>
      </div>

      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-value">{{ ipStats.length }}</div>
          <div class="stat-label">总 IP 数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ blockedIPs.length }}</div>
          <div class="stat-label">已封禁 IP</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ loginRecords.length }}</div>
          <div class="stat-label">登录记录</div>
        </div>
      </div>

      <div class="tabs">
        <button
          :class="['tab', { active: currentTab === 'ips' }]"
          @click="currentTab = 'ips'"
        >
          IP 统计
        </button>
        <button
          :class="['tab', { active: currentTab === 'records' }]"
          @click="currentTab = 'records'"
        >
          登录记录
        </button>
        <button
          :class="['tab', { active: currentTab === 'blocked' }]"
          @click="currentTab = 'blocked'"
        >
          封禁列表
        </button>
      </div>

      <!-- IP 统计 -->
      <div v-if="currentTab === 'ips'" class="content-section">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索 IP 地址或位置..."
            class="search-input"
          />
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>IP 地址</th>
                <th>位置</th>
                <th>使用密码</th>
                <th>登录次数</th>
                <th>最后登录</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stat in filteredIPStats" :key="stat.ip" :class="{ blocked: stat.blocked }">
                <td class="ip-cell">{{ stat.ip }}</td>
                <td>
                  <div class="location">
                    <div>{{ stat.location.country }} {{ stat.location.region }}</div>
                    <div class="location-detail">{{ stat.location.city }} - {{ stat.location.isp }}</div>
                  </div>
                </td>
                <td>
                  <div class="passwords">
                    <span v-for="pwd in stat.passwords" :key="pwd" class="password-badge">
                      {{ pwd }}
                    </span>
                  </div>
                </td>
                <td>{{ stat.loginCount }}</td>
                <td>{{ formatTime(stat.lastLogin) }}</td>
                <td>
                  <span :class="['status-badge', stat.blocked ? 'blocked' : 'active']">
                    {{ stat.blocked ? '已封禁' : '正常' }}
                  </span>
                </td>
                <td>
                  <button
                    v-if="!stat.blocked"
                    @click="blockIP(stat.ip)"
                    class="action-btn block-btn"
                  >
                    封禁
                  </button>
                  <button
                    v-else
                    @click="unblockIP(stat.ip)"
                    class="action-btn unblock-btn"
                  >
                    解封
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 登录记录 -->
      <div v-if="currentTab === 'records'" class="content-section">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>IP 地址</th>
                <th>位置</th>
                <th>密码</th>
                <th>设备信息</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(record, index) in loginRecords" :key="index">
                <td>{{ formatTime(record.timestamp) }}</td>
                <td class="ip-cell">{{ record.ip }}</td>
                <td>
                  <div class="location">
                    <div>{{ record.location.country }} {{ record.location.region }}</div>
                    <div class="location-detail">{{ record.location.city }}</div>
                  </div>
                </td>
                <td><span class="password-badge">{{ record.password }}</span></td>
                <td class="user-agent">{{ record.userAgent }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 封禁列表 -->
      <div v-if="currentTab === 'blocked'" class="content-section">
        <div v-if="blockedIPs.length === 0" class="empty-state">
          <p>暂无封禁的 IP</p>
        </div>
        <div v-else class="blocked-list">
          <div v-for="ip in blockedIPs" :key="ip" class="blocked-item">
            <span class="ip-text">{{ ip }}</span>
            <button @click="unblockIP(ip)" class="action-btn unblock-btn">解封</button>
          </div>
        </div>
      </div>

      <button @click="refreshData" class="refresh-btn">🔄 刷新数据</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const isAdminLoggedIn = ref(false)
const adminPassword = ref('')
const errorMsg = ref('')
const currentTab = ref('ips')
const searchQuery = ref('')

const ipStats = ref([])
const loginRecords = ref([])
const blockedIPs = ref([])

// 管理员登录
const handleAdminLogin = async () => {
  errorMsg.value = ''

  if (!adminPassword.value) {
    errorMsg.value = '请输入管理员密码'
    return
  }

  try {
    const response = await fetch('/.netlify/functions/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'admin-login',
        adminPassword: adminPassword.value
      })
    })

    const data = await response.json()

    if (response.ok && data.success) {
      isAdminLoggedIn.value = true
      sessionStorage.setItem('admin_password', adminPassword.value)
      await loadData()
    } else {
      errorMsg.value = data.error || '登录失败'
      adminPassword.value = ''
    }
  } catch (error) {
    console.error('登录错误:', error)
    errorMsg.value = '网络错误'
  }
}

// 加载数据
const loadData = async () => {
  try {
    const password = sessionStorage.getItem('admin_password')
    const response = await fetch('/.netlify/functions/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'admin-get-records',
        adminPassword: password
      })
    })

    const data = await response.json()

    if (response.ok) {
      ipStats.value = data.ipStats
      loginRecords.value = data.records
      blockedIPs.value = data.blockedIPs
    }
  } catch (error) {
    console.error('加载数据错误:', error)
  }
}

// 封禁 IP
const blockIP = async (ip) => {
  if (!confirm(`确定要封禁 IP ${ip} 吗？`)) return

  try {
    const password = sessionStorage.getItem('admin_password')
    const response = await fetch('/.netlify/functions/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'admin-block-ip',
        adminPassword: password,
        ipToBlock: ip
      })
    })

    const data = await response.json()

    if (response.ok && data.success) {
      alert(data.message)
      await loadData()
    } else {
      alert(data.error || '操作失败')
    }
  } catch (error) {
    console.error('封禁错误:', error)
    alert('网络错误')
  }
}

// 解封 IP
const unblockIP = async (ip) => {
  if (!confirm(`确定要解封 IP ${ip} 吗？`)) return

  try {
    const password = sessionStorage.getItem('admin_password')
    const response = await fetch('/.netlify/functions/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'admin-unblock-ip',
        adminPassword: password,
        ipToBlock: ip
      })
    })

    const data = await response.json()

    if (response.ok && data.success) {
      alert(data.message)
      await loadData()
    } else {
      alert(data.error || '操作失败')
    }
  } catch (error) {
    console.error('解封错误:', error)
    alert('网络错误')
  }
}

// 刷新数据
const refreshData = () => {
  loadData()
}

// 退出登录
const handleLogout = () => {
  if (confirm('确定要退出管理后台吗？')) {
    isAdminLoggedIn.value = false
    sessionStorage.removeItem('admin_password')
    adminPassword.value = ''
  }
}

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 过滤 IP 统计
const filteredIPStats = computed(() => {
  if (!searchQuery.value) return ipStats.value

  const query = searchQuery.value.toLowerCase()
  return ipStats.value.filter(stat =>
    stat.ip.toLowerCase().includes(query) ||
    stat.location.country.toLowerCase().includes(query) ||
    stat.location.region.toLowerCase().includes(query) ||
    stat.location.city.toLowerCase().includes(query)
  )
})

// 页面加载时检查是否已登录
onMounted(() => {
  const savedPassword = sessionStorage.getItem('admin_password')
  if (savedPassword) {
    adminPassword.value = savedPassword
    handleAdminLogin()
  }
})
</script>

<style scoped>
.admin-container {
  min-height: 100vh;
  background: #f5f7fa;
}

/* 登录页面 */
.admin-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

.login-box h1 {
  color: #333;
  margin-bottom: 30px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.admin-input {
  padding: 15px 20px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s;
}

.admin-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.admin-btn {
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

.admin-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.error-msg {
  color: #f56c6c;
  margin-top: 15px;
  font-size: 14px;
}

/* 管理后台 */
.admin-panel {
  padding: 30px;
  max-width: 1400px;
  margin: 0 auto;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.admin-header h1 {
  color: #333;
  font-size: 28px;
}

.logout-btn {
  padding: 10px 20px;
  background: #f56c6c;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.logout-btn:hover {
  background: #f78989;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-value {
  font-size: 36px;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 10px;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

/* 标签页 */
.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.tab {
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  color: #666;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.tab:hover {
  color: #667eea;
}

.tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

/* 内容区域 */
.content-section {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

/* 搜索框 */
.search-box {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 12px 20px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
}

/* 表格 */
.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: #f5f7fa;
}

.data-table th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
}

.data-table td {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.data-table tr:hover {
  background: #f9f9f9;
}

.data-table tr.blocked {
  background: #fff5f5;
}

.ip-cell {
  font-family: monospace;
  font-weight: 600;
  color: #667eea;
}

.location {
  font-size: 14px;
}

.location-detail {
  color: #999;
  font-size: 12px;
  margin-top: 2px;
}

.passwords {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.password-badge {
  display: inline-block;
  padding: 4px 10px;
  background: #e6f4ff;
  color: #409eff;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.active {
  background: #f0f9ff;
  color: #67c23a;
}

.status-badge.blocked {
  background: #fff5f5;
  color: #f56c6c;
}

.action-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.block-btn {
  background: #f56c6c;
  color: white;
}

.block-btn:hover {
  background: #f78989;
}

.unblock-btn {
  background: #67c23a;
  color: white;
}

.unblock-btn:hover {
  background: #85ce61;
}

.user-agent {
  font-size: 12px;
  color: #999;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 封禁列表 */
.blocked-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.blocked-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #fff5f5;
  border-radius: 8px;
  border-left: 4px solid #f56c6c;
}

.ip-text {
  font-family: monospace;
  font-weight: 600;
  color: #333;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  font-size: 16px;
}

/* 刷新按钮 */
.refresh-btn {
  display: block;
  margin: 0 auto;
  padding: 12px 30px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.refresh-btn:hover {
  background: #66b1ff;
  transform: translateY(-2px);
}
</style>
