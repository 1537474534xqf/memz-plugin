import os from 'os'
import path from 'path'
import fs from 'fs'

export default function setupDebugRoutes (app) {
  // 获取Express版本
  const getExpressVersion = () => {
    try {
      // 尝试从package.json读取Express版本
      const packagePath = path.join(process.cwd(), 'node_modules', 'express', 'package.json')
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
      return packageJson.version
    } catch (err) {
      console.log('读取Express版本失败:', err)
      return '未知'
    }
  }

  // 获取系统信息
  const getSystemInfo = () => {
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
    }

    const formatUptime = (seconds) => {
      const days = Math.floor(seconds / (3600 * 24))
      const hours = Math.floor((seconds % (3600 * 24)) / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${days}天 ${hours}小时 ${minutes}分钟`
    }

    // 计算总体CPU使用率
    const cpus = os.cpus()
    const totalTimes = cpus.reduce((acc, cpu) => {
      Object.keys(cpu.times).forEach(type => {
        acc[type] = (acc[type] || 0) + cpu.times[type]
      })
      return acc
    }, {})

    const totalUsage = (100 - totalTimes.idle / (totalTimes.user + totalTimes.nice + totalTimes.sys + totalTimes.idle + totalTimes.irq) * 100).toFixed(1)

    // 获取磁盘信息
    const getDiskInfo = () => {
      try {
        const disk = fs.statfsSync(process.cwd())
        const total = disk.blocks * disk.bsize
        const free = disk.bfree * disk.bsize
        const used = total - free
        return {
          total: formatBytes(total),
          free: formatBytes(free),
          used: formatBytes(used),
          usage: ((used / total) * 100).toFixed(1) + '%'
        }
      } catch (err) {
        console.error('获取磁盘信息失败:', err)
        return {
          total: '未知',
          free: '未知',
          used: '未知',
          usage: '0%'
        }
      }
    }

    return {
      expressVersion: getExpressVersion(),
      nodeInfo: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        ppid: process.ppid,
        nodeEnv: process.env.NODE_ENV || '未设置',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: process.env.LANG || process.env.LANGUAGE || '未设置'
      },
      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        type: os.type(),
        uptime: formatUptime(os.uptime()),
        loadavg: os.loadavg().map(load => load.toFixed(2))
      },
      cpu: {
        cores: cpus.length,
        model: cpus[0].model.replace(/\s+/g, ' ').trim(),
        speed: `${cpus[0].speed} MHz`,
        usage: `${totalUsage}%`
      },
      memory: {
        total: formatBytes(os.totalmem()),
        free: formatBytes(os.freemem()),
        used: formatBytes(os.totalmem() - os.freemem()),
        usage: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(1) + '%',
        process: {
          rss: formatBytes(process.memoryUsage().rss),
          heapTotal: formatBytes(process.memoryUsage().heapTotal),
          heapUsed: formatBytes(process.memoryUsage().heapUsed),
          external: formatBytes(process.memoryUsage().external),
          arrayBuffers: formatBytes(process.memoryUsage().arrayBuffers || 0)
        }
      },
      network: Object.entries(os.networkInterfaces()).reduce((acc, [name, interfaces]) => {
        acc[name] = interfaces
          .filter(iface => !iface.internal)
          .map(iface => ({
            family: iface.family,
            address: iface.address,
            netmask: iface.netmask,
            mac: iface.mac
          }))
        return acc
      }, {}),
      disk: getDiskInfo()
    }
  }

  // 诊断路由
  app.get('/debug', async (req, res) => {
    const routes = []
    const sysInfo = getSystemInfo()

    // 获取已注册路由
    app._router.stack.forEach(middleware => {
      if (middleware.route) {
        routes.push({
          path: middleware.route.path,
          method: Object.keys(middleware.route.methods)[0].toUpperCase()
        })
      }
    })

    // 返回HTML页面
    res.send(`
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>MEMZ-API调试工具</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/atom-one-dark.min.css">
          <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/languages/json.min.js"></script>
          
          <style>
            :root {
              --primary: #6366f1;
              --primary-light: #eef2ff;
              --primary-dark: #4f46e5;
              --success: #22c55e;
              --warning: #f59e0b;
              --danger: #ef4444;
              --dark: #1f2937;
              --light: #f9fafb;
              --gray: #6b7280;
              --border: #e5e7eb;
              --radius: 12px;
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #f3f4f6;
              color: var(--dark);
              line-height: 1.5;
            }
            
            /* 页面布局 */
            .page-wrapper {
              min-height: 100vh;
              display: flex;
              flex-direction: column;
            }

            /* 头部样式 */
            .header {
              background: linear-gradient(135deg, var(--primary), var(--primary-dark));
              color: white;
              padding: 2.5rem 0;
              margin-bottom: -4rem;
              position: relative;
              overflow: hidden;
            }

            .header::before {
              content: '';
              position: absolute;
              top: -50%;
              left: -50%;
              width: 200%;
              height: 200%;
              background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
              animation: rotate 60s linear infinite;
            }

            @keyframes rotate {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }

            .header-content {
              position: relative;
              z-index: 1;
            }
            
            .header h1 {
              font-size: 2rem;
              font-weight: 700;
              margin-bottom: 0.5rem;
            }

            .header-info {
              display: flex;
              gap: 1rem;
              opacity: 0.9;
              font-size: 0.9rem;
            }

            .header-info span:nth-child(even) {
              opacity: 0.5;
            }

            /* 主容器 */
            .container {
              width: 100%;
              max-width: 1400px;
              margin: 0 auto;
              padding: 0 1.5rem;
            }

            /* 主要内容区 */
            .main-content {
              flex: 1;
              padding: 2rem 0;
            }

            /* 卡片网格 */
            .grid-container {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
              gap: 1.5rem;
              margin: 2rem 0;
            }

            /* 卡片样式 */
            .card {
              background: white;
              border-radius: var(--radius);
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              overflow: hidden;
              transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            
            .card:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            }
            
            .card-header {
              padding: 1.25rem 1.5rem;
              border-bottom: 1px solid var(--border);
              display: flex;
              align-items: center;
              gap: 0.75rem;
              background: var(--primary-light);
            }

            .card-header h4 {
              color: var(--primary);
              font-size: 1.1rem;
              font-weight: 600;
              margin: 0;
            }
            
            .card-body {
              padding: 1.5rem;
            }

            /* 信息列表 */
            .info-list {
              list-style: none;
            }

            .info-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 0.75rem 0;
              border-bottom: 1px dashed var(--border);
              gap: 1rem;
            }

            .info-item:last-child {
              border-bottom: none;
              padding-bottom: 0;
            }

            .info-item:first-child {
              padding-top: 0;
            }

            .info-label {
              color: var(--gray);
              font-size: 0.875rem;
            }

            .info-value {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              background: var(--primary-light);
              padding: 0.375rem 0.75rem;
              border-radius: 6px;
              font-size: 0.8125rem;
              color: var(--primary-dark);
              max-width: 200px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            /* 使用率条 */
            .usage-wrapper {
              display: flex;
              align-items: center;
              gap: 0.75rem;
              flex: 1;
            }

            .usage-bar {
              flex: 1;
              height: 6px;
              background: var(--border);
              border-radius: 3px;
              overflow: hidden;
            }

            .usage-fill {
              height: 100%;
              background: linear-gradient(90deg, var(--primary), var(--primary-dark));
              border-radius: 3px;
              transition: width 0.3s ease;
            }

            .usage-text {
              min-width: 48px;
              font-family: ui-monospace, monospace;
              font-size: 0.8125rem;
              color: var(--primary-dark);
            }

            /* 响应式设计 */
            @media (max-width: 768px) {
              .header {
                margin-bottom: -2rem;
                padding: 2rem 0;
              }

              .header h1 {
                font-size: 1.5rem;
              }

              .grid-container {
                grid-template-columns: 1fr;
              }

              .info-value {
                max-width: 150px;
              }
            }

            /* 深色模式 */
            @media (prefers-color-scheme: dark) {
              :root {
                --primary-light: rgba(99, 102, 241, 0.1);
                --dark: #f3f4f6;
                --light: #111827;
                --gray: #9ca3af;
                --border: #374151;
              }

              body {
                background-color: #111827;
              }

              .card {
                background: #1f2937;
                border: 1px solid #374151;
              }

              .card-header {
                background: rgba(99, 102, 241, 0.1);
                border-bottom-color: #374151;
              }

              .info-item {
                border-bottom-color: #374151;
              }

              .usage-bar {
                background: #374151;
              }
            }

            /* 路由表样式 */
            .routes-card {
              grid-column: 1 / -1;  /* 让路由表占据整行 */
            }
            
            .route-filter {
              margin-bottom: 1rem;
              position: relative;
            }
            
            .route-filter::before {
              content: '🔍';
              position: absolute;
              left: 1rem;
              top: 50%;
              transform: translateY(-50%);
              pointer-events: none;
            }
            
            .route-filter input {
              width: 100%;
              padding: 0.75rem 1rem 0.75rem 2.5rem;
              border: 1px solid var(--border);
              border-radius: var(--radius);
              font-size: 0.875rem;
              transition: all 0.2s ease;
            }
            
            .route-filter input:focus {
              outline: none;
              border-color: var(--primary);
              box-shadow: 0 0 0 3px var(--primary-light);
            }
            
            .routes-table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
            }
            
            .routes-table th {
              text-align: left;
              padding: 1rem;
              background: var(--primary-light);
              color: var(--primary);
              font-weight: 600;
              position: sticky;
              top: 0;
              z-index: 10;
            }
            
            .routes-table th:first-child {
              border-top-left-radius: var(--radius);
            }
            
            .routes-table th:last-child {
              border-top-right-radius: var(--radius);
            }
            
            .routes-table td {
              padding: 0.75rem 1rem;
              border-bottom: 1px solid var(--border);
              transition: all 0.2s;
            }
            
            .routes-table tr:hover td {
              background: var(--primary-light);
            }
            
            .routes-table tr:last-child td:first-child {
              border-bottom-left-radius: var(--radius);
            }
            
            .routes-table tr:last-child td:last-child {
              border-bottom-right-radius: var(--radius);
            }
            
            /* 美化HTTP方法标签 */
            .method-badge {
              display: inline-block;
              padding: 0.25rem 0.5rem;
              border-radius: 4px;
              font-size: 0.75rem;
              font-weight: 600;
              text-transform: uppercase;
              min-width: 60px;
              text-align: center;
            }
            
            .method-get { 
              background: #22c55e;
              color: white;
            }
            
            .method-post { 
              background: #6366f1;
              color: white;
            }
            
            .method-put { 
              background: #f59e0b;
              color: white;
            }
            
            .method-delete { 
              background: #ef4444;
              color: white;
            }
            
            .method-patch { 
              background: #8b5cf6;
              color: white;
            }
            
            .method-options {
              background: #0ea5e9;
              color: white;
            }
            
            .method-head {
              background: #64748b;
              color: white;
            }
            
            /* API调试工具基础样式 */
            .api-tester {
              position: fixed;
              top: 0;
              right: 0;
              bottom: 0;
              width: 600px;
              max-width: 100%;
              background: rgba(255, 255, 255, 0.98);
              backdrop-filter: blur(10px);
              border-left: 1px solid rgba(0, 0, 0, 0.1);
              z-index: 1000;
              display: none;
              flex-direction: column;
              animation: slideIn 0.3s ease;
            }
            
            .tester-header {
              background: linear-gradient(135deg, var(--primary), var(--primary-dark));
              padding: 1.5rem;
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 1rem;
            }

            .tester-title {
              color: white;
              font-size: 1.25rem;
              font-weight: 600;
              margin: 0;
            }
            
            .tester-body {
              flex: 1;
              overflow-y: auto;
              padding: 1.5rem;
            }

            /* 请求表单样式 */
            .tester-form-group {
              margin-bottom: 1.5rem;
            }

            .tester-input-group {
              display: flex;
              gap: 0.75rem;
            }

            /* 下拉菜单样式优化 */
            .tester-select {
              min-width: 120px;
              width: auto;
              cursor: pointer;
              background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
              background-repeat: no-repeat;
              background-position: right 0.75rem center;
              background-size: 1rem;
              padding-right: 2.5rem;
              -webkit-appearance: none;
              -moz-appearance: none;
              appearance: none;
              font-weight: 500;
              color: #4b5563;
              background-color: white;
              border: 1px solid var(--border);
              border-radius: var(--radius);
              padding: 0.75rem 2.5rem 0.75rem 1rem;
              transition: all 0.2s ease;
            }

            /* 下拉菜单选项样式 */
            .tester-select option {
              padding: 0.75rem;
              font-weight: 500;
            }

            /* 为不同的HTTP方法设置不同的颜色 */
            .tester-select option[value="GET"] {
              color: #22c55e;
            }

            .tester-select option[value="POST"] {
              color: #6366f1;
            }

            .tester-select option[value="PUT"] {
              color: #f59e0b;
            }

            .tester-select option[value="DELETE"] {
              color: #ef4444;
            }

            .tester-select option[value="PATCH"] {
              color: #8b5cf6;
            }

            /* 深色模式下拉菜单样式 */
            @media (prefers-color-scheme: dark) {
              .tester-select {
                background-color: #374151;
                color: white;
                border-color: #4b5563;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
              }
              
              .tester-select option {
                background-color: #1f2937;
              }
            }

            .tester-input {
              flex: 1;
              padding: 0.75rem 1rem;
              border: 1px solid var(--border);
              border-radius: var(--radius);
              font-size: 0.875rem;
              transition: all 0.2s ease;
              background: white;
              width: 100%;
            }

            .tester-textarea {
              width: 100%;
              min-height: 120px;
              padding: 0.75rem 1rem;
              border: 1px solid var(--border);
              border-radius: var(--radius);
              font-size: 0.875rem;
              transition: all 0.2s ease;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              line-height: 1.6;
              resize: vertical;
            }

            .tester-select:focus,
            .tester-input:focus,
            .tester-textarea:focus {
              outline: none;
              border-color: var(--primary);
              box-shadow: 0 0 0 3px var(--primary-light);
            }

            /* 标签页样式 */
            .tester-tabs {
              display: flex;
              gap: 1rem;
              border-bottom: 1px solid var(--border);
              margin-bottom: 1.5rem;
            }

            .tester-tab {
              padding: 0.75rem 0;
              color: var(--gray);
              cursor: pointer;
              position: relative;
              transition: all 0.2s ease;
              font-weight: 500;
            }

            .tester-tab::after {
              content: '';
              position: absolute;
              bottom: -1px;
              left: 0;
              right: 0;
              height: 2px;
              background: var(--primary);
              transform: scaleX(0);
              transition: transform 0.2s ease;
            }

            .tester-tab:hover {
              color: var(--primary);
            }

            .tester-tab.active {
              color: var(--primary);
            }

            .tester-tab.active::after {
              transform: scaleX(1);
            }

            /* 参数行样式 */
            .param-row {
              display: flex;
              gap: 0.75rem;
              margin-bottom: 0.75rem;
              align-items: center;
              transition: all 0.2s ease;
            }

            .param-row:hover {
              transform: translateX(2px);
            }

            .param-row .tester-input {
              transition: all 0.2s ease;
            }

            .param-row:hover .tester-input {
              border-color: var(--primary);
            }

            .param-row .tester-btn.remove-param {
              padding: 0.5rem;
              min-width: 40px;
              background: transparent;
              color: var(--danger);
              border: 1px solid var(--danger);
              border-radius: var(--radius);
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .param-row .tester-btn.remove-param:hover {
              background: var(--danger);
              color: white;
              box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
            }

            /* 响应区域样式优化 */
            .response-area {
              margin-top: 2rem;
              padding-top: 1.5rem;
              border-top: 1px solid var(--border);
              animation: fadeIn 0.3s ease;
            }

            .response-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 1rem;
            }

            .response-body {
              position: relative;
              background: #1e293b;
              border-radius: var(--radius);
              overflow: hidden;
              max-height: 500px;
            }

            .response-body pre {
              margin: 0;
              padding: 1.5rem;
              overflow: auto;
              font-family: 'Fira Code', monospace;
              font-size: 0.875rem;
              line-height: 1.6;
              max-height: 500px;
              color: #e2e8f0;
            }

            /* 响应操作按钮 */
            .response-actions {
              position: absolute;
              top: 0.75rem;
              right: 0.75rem;
              display: flex;
              gap: 0.5rem;
              opacity: 0;
              transition: opacity 0.2s ease;
            }

            .response-body:hover .response-actions {
              opacity: 1;
            }

            .response-btn {
              padding: 0.375rem 0.75rem;
              background: rgba(255, 255, 255, 0.1);
              color: white;
              border: none;
              border-radius: 4px;
              font-size: 0.75rem;
              cursor: pointer;
              transition: all 0.2s ease;
              backdrop-filter: blur(4px);
            }

            .response-btn:hover {
              background: rgba(255, 255, 255, 0.2);
            }

            /* 美化状态显示 */
            .status {
              padding: 0.5rem 1rem;
              border-radius: var(--radius);
              font-weight: 500;
              font-size: 0.875rem;
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
            }

            .status::before {
              content: '';
              display: inline-block;
              width: 8px;
              height: 8px;
              border-radius: 50%;
            }
            
            .status-success {
              background: rgba(34, 197, 94, 0.1);
              color: var(--success);
            }

            .status-success::before {
              background: var(--success);
            }
            
            .status-error {
              background: rgba(239, 68, 68, 0.1);
              color: var(--danger);
            }
            
            .status-error::before {
              background: var(--danger);
            }

            /* 美化响应时间显示 */
            .response-time {
              font-size: 0.875rem;
              color: var(--gray);
              background: var(--primary-light);
              padding: 0.375rem 0.75rem;
              border-radius: var(--radius);
            }

            /* 统一按钮基础样式 */
            .btn, 
            .tester-btn,
            .test-api-btn {
              padding: 0.75rem 1rem;
              background: var(--primary);
              color: white;
              border: none;
              border-radius: var(--radius);
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 0.5rem;
              font-size: 0.875rem;
              text-decoration: none;
            }

            .btn:hover, 
            .tester-btn:hover,
            .test-api-btn:hover {
              background: var(--primary-dark);
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
            }

            .btn:active, 
            .tester-btn:active,
            .test-api-btn:active {
              transform: translateY(0);
            }

            .btn:disabled, 
            .tester-btn:disabled,
            .test-api-btn:disabled {
              opacity: 0.7;
              cursor: not-allowed;
              transform: none;
              box-shadow: none;
            }

            /* 小型按钮 */
            .btn-sm, 
            .tester-btn.btn-sm,
            .test-api-btn {
              padding: 0.375rem 0.75rem;
              font-size: 0.75rem;
            }

            /* 测试按钮特殊样式 */
            .test-api-btn {
              background: var(--primary-light);
              color: var(--primary);
              white-space: nowrap;
            }

            .test-api-btn:hover {
              background: var(--primary);
              color: white;
            }

            /* 删除按钮特殊样式 */
            .tester-btn.remove-param,
            .param-row .tester-btn.remove-param {
              padding: 0.5rem;
              min-width: 40px;
              background: transparent;
              color: var(--danger);
              border: 1px solid var(--danger);
            }

            .tester-btn.remove-param:hover,
            .param-row .tester-btn.remove-param:hover {
              background: var(--danger);
              color: white;
              box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
            }

            /* 关闭按钮特殊样式 */
            .tester-close {
              background: rgba(255, 255, 255, 0.2);
              color: white;
              border: none;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              font-size: 1.5rem;
              line-height: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all 0.2s ease;
              padding: 0;
            }

            .tester-close:hover {
              background: rgba(255, 255, 255, 0.3);
              transform: rotate(90deg);
            }

            /* 标签页内容样式 */
            .tab-content {
              display: none;
              padding: 1rem 0;
            }

            .tab-content.active {
              display: block;
              animation: fadeIn 0.2s ease;
            }

            /* 添加JSON高亮样式 */
            .hljs-string {
              color: #a5d6ff;
            }

            .hljs-number {
              color: #ffab70;
            }

            .hljs-boolean {
              color: #ff7b72;
            }

            .hljs-null {
              color: #ff7b72;
            }

            .hljs-punctuation {
              color: #c9d1d9;
            }

            .hljs-property {
              color: #79c0ff;
            }
          </style>
        </head>
        <body>
          <div class="page-wrapper">
            <header class="header">
            <div class="container">
                <div class="header-content">
                  <h1>MEMZ-API调试工具</h1>
                  <div class="header-info">
                    <span>Express ${sysInfo.expressVersion}</span>
                    <span>·</span>
                    <span>Node ${sysInfo.nodeInfo.version}</span>
                    <span>·</span>
                    <span>路由数量: ${routes.length}</span>
            </div>
          </div>
              </div>
            </header>
          
            <main class="main-content">
          <div class="container">
                <div class="grid-container">
                  <!-- 运行环境卡片 -->
                  <div class="card">
                    <div class="card-header">
                      <h4>运行环境</h4>
                    </div>
                    <div class="card-body">
                      <ul class="info-list">
                        <li class="info-item">
                          <span class="info-label">Node版本</span>
                          <span class="info-value">${sysInfo.nodeInfo.version}</span>
                        </li>
                        <li class="info-item">
                          <span class="info-label">Express版本</span>
                          <span class="info-value">${sysInfo.expressVersion}</span>
                        </li>
                        <li class="info-item">
                          <span class="info-label">系统类型</span>
                          <span class="info-value">${sysInfo.system.type} (${sysInfo.system.release})</span>
                        </li>
                        <li class="info-item">
                          <span class="info-label">系统架构</span>
                          <span class="info-value">${sysInfo.nodeInfo.arch}</span>
                        </li>
                        <li class="info-item">
                          <span class="info-label">时区</span>
                          <span class="info-value">${sysInfo.nodeInfo.timezone}</span>
                        </li>
                        <li class="info-item">
                          <span class="info-label">语言环境</span>
                          <span class="info-value">${sysInfo.nodeInfo.locale}</span>
                        </li>
                      </ul>
                    </div>
            </div>
            
                  <!-- CPU信息卡片 -->
            <div class="card">
              <div class="card-header">
                      <h4>CPU信息</h4>
              </div>
              <div class="card-body">
                      <ul class="info-list">
                        <li class="info-item">
                          <span class="info-label">处理器</span>
                          <span class="info-value">${sysInfo.cpu.model}</span>
                        </li>
                        <li class="info-item">
                          <span class="info-label">核心数</span>
                          <span class="info-value">${sysInfo.cpu.cores} 核心</span>
                        </li>
                        <li class="info-item">
                          <span class="info-label">频率</span>
                          <span class="info-value">${sysInfo.cpu.speed}</span>
                        </li>
                        <li class="info-item">
                          <span class="info-label">CPU使用率</span>
                          <div class="usage-wrapper">
                            <div class="usage-bar">
                              <div class="usage-fill" style="width: ${sysInfo.cpu.usage}"></div>
                            </div>
                            <span class="usage-text">${sysInfo.cpu.usage}</span>
                          </div>
                        </li>
                        <li class="info-item">
                          <span class="info-label">平均负载</span>
                          <span class="info-value">${sysInfo.system.loadavg.join(', ')}</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <!-- 内存信息卡片 -->
                  <div class="card">
                    <div class="card-header">
                      <h4>内存使用</h4>
                    </div>
                    <div class="card-body">
                      <ul class="info-list">
                        <li class="info-item">
                          <span class="info-label">系统总内存</span>
                          <span class="info-value">${sysInfo.memory.total}</span>
                        </li>
                        <li class="info-item">
                          <span class="info-label">系统已用</span>
                          <div class="usage-wrapper">
                            <div class="usage-bar">
                              <div class="usage-fill" style="width: ${sysInfo.memory.usage}"></div>
                            </div>
                            <span class="usage-text">${sysInfo.memory.usage}</span>
                          </div>
                        </li>
                        <li class="info-item">
                          <span class="info-label">系统空闲</span>
                          <span class="info-value">${sysInfo.memory.free}</span>
                        </li>
                        <li class="info-item">
                          <span class="info-label">进程内存</span>
                          <span class="info-value">${sysInfo.memory.process.rss}</span>
                        </li>
                        <li class="info-item">
                          <span class="info-label">堆内存使用</span>
                          <span class="info-value">${sysInfo.memory.process.heapUsed}</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <!-- 网络信息卡片 -->
                  <div class="card">
                    <div class="card-header">
                      <h4>网络信息</h4>
                    </div>
                    <div class="card-body">
                      <ul class="info-list">
                        ${Object.entries(sysInfo.network).map(([name, interfaces]) => {
                          return interfaces.map(iface => {
                            return `
                              <li class="info-item">
                                <span class="info-label">${name} (${iface.family})</span>
                                <span class="info-value">${iface.address}</span>
                              </li>
                              <li class="info-item">
                                <span class="info-label">MAC地址</span>
                                <span class="info-value">${iface.mac}</span>
                              </li>
                            `
                          }).join('')
                        }).join('')}
                      </ul>
                    </div>
                  </div>

                  <!-- 进程信息卡片 -->
                  <div class="card">
                    <div class="card-header">
                      <h4>进程信息</h4>
                    </div>
                    <div class="card-body">
                      <ul class="info-list">
                        <li class="info-item">
                          <span class="info-label">进程ID</span>
                          <span class="info-value">${sysInfo.nodeInfo.pid}</span>
                        </li>
                        <li class="info-item">
                          <span class="info-label">父进程ID</span>
                          <span class="info-value">${sysInfo.nodeInfo.ppid}</span>
                        </li>
                        <li class="info-item">
                          <span class="info-label">运行时长</span>
                          <span class="info-value">${sysInfo.system.uptime}</span>
                        </li>
                        <li class="info-item">
                          <span class="info-label">Node环境</span>
                          <span class="info-value">${sysInfo.nodeInfo.nodeEnv}</span>
                        </li>
                        <li class="info-item">
                          <span class="info-label">工作目录</span>
                          <span class="info-value">${process.cwd()}</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <!-- 磁盘信息卡片 -->
                  <div class="card">
                    <div class="card-header">
                      <h4>磁盘信息</h4>
                    </div>
                    <div class="card-body">
                      <ul class="info-list">
                        <li class="info-item">
                          <span class="info-label">总容量</span>
                          <span class="info-value">${sysInfo.disk.total}</span>
                        </li>
                        <li class="info-item">
                          <span class="info-label">已用空间</span>
                          <div class="usage-wrapper">
                            <div class="usage-bar">
                              <div class="usage-fill" style="width: ${sysInfo.disk.usage}"></div>
                            </div>
                            <span class="usage-text">${sysInfo.disk.usage}</span>
                          </div>
                        </li>
                        <li class="info-item">
                          <span class="info-label">可用空间</span>
                          <span class="info-value">${sysInfo.disk.free}</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <!-- 路由表卡片 -->
                  <div class="card routes-card">
                    <div class="card-header">
                      <h4>路由列表</h4>
                    </div>
                    <div class="card-body">
                      <div class="route-filter">
                        <input type="text" class="tester-input" id="route-filter" placeholder="输入路径过滤路由...">
                      </div>
                      <table class="routes-table">
                  <thead>
                    <tr>
                      <th>方法</th>
                      <th>路径</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody id="routes-table">
                    ${routes.map(route => `
                      <tr class="route-row">
                        <td>
                          <span class="method-badge method-${route.method.toLowerCase()}">${route.method}</span>
                        </td>
                        <td>${route.path}</td>
                        <td>
                                <button class="tester-btn btn-sm test-api-btn" data-path="${route.path}" data-method="${route.method}">
                                  测试
                                </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
              </div>
              </div>
            </main>
          </div>
          
          <div class="api-tester" id="api-tester">
            <div class="tester-header">
              <h3 class="tester-title">API测试</h3>
              <button class="tester-close" id="close-tester">&times;</button>
            </div>
            <div class="tester-body">
              <div class="tester-form-group">
                <div class="tester-input-group">
                  <select class="tester-select" id="method-select">
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                  <input type="text" class="tester-input" id="url-input" placeholder="请输入API路径">
                  <button class="tester-btn" id="send-btn">
                    <span class="loader" id="loading"></span>
                    发送请求
                  </button>
                </div>
              </div>
              
              <div class="tester-tabs">
                <div class="tester-tab active" id="params-tab-btn">查询参数</div>
                <div class="tester-tab" id="headers-tab-btn">请求头</div>
                <div class="tester-tab" id="body-tab-btn">请求体</div>
              </div>
              
              <div class="tab-content active" id="params-tab">
                <div id="params-container">
                  <div class="param-row">
                    <input type="text" class="tester-input" placeholder="参数名">
                    <input type="text" class="tester-input" placeholder="参数值">
                    <button class="tester-btn remove-param">删除</button>
                  </div>
                </div>
                <button class="tester-btn" id="add-param-btn" style="margin-top: 1rem;">添加参数</button>
              </div>
              
              <div class="tab-content" id="headers-tab">
                <div id="headers-container">
                  <div class="param-row">
                    <input type="text" class="tester-input" value="Content-Type">
                    <input type="text" class="tester-input" value="application/json">
                    <button class="tester-btn remove-param">删除</button>
                  </div>
                </div>
                <button class="tester-btn" id="add-header-btn" style="margin-top: 1rem;">添加请求头</button>
              </div>
              
              <div class="tab-content" id="body-tab">
                <textarea class="tester-textarea" id="request-body" rows="8" 
                  placeholder="请输入请求体内容，例如：&#13;&#10;{&#13;&#10;  &quot;key&quot;: &quot;value&quot;&#13;&#10;}"></textarea>
                <button class="tester-btn" id="format-json-btn" style="margin-top: 1rem;">格式化JSON</button>
              </div>
              
              <div class="response-area" id="response-area" style="display: none;">
                <div class="response-header">
                  <div class="status" id="status"></div>
                  <div class="response-time" id="response-time"></div>
                </div>
                <div class="response-body">
                  <pre id="response-output"></pre>
                  <div class="response-actions">
                    <button class="response-btn" id="format-json">格式化</button>
                    <button class="response-btn" id="copy-response">复制</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="overlay" id="overlay"></div>
          
          <script>
            // 页面加载完成后执行初始化
            document.addEventListener('DOMContentLoaded', function() {
              initializeEventListeners();
            });
            
            // 格式化JSON函数
            function formatJsonString(jsonString) {
              try {
                if (!jsonString.trim()) return '';
                const parsedJson = JSON.parse(jsonString);
                return JSON.stringify(parsedJson, null, 2);
              } catch (e) {
                return jsonString;
              }
            }
            
            // 语法高亮函数（简易版）
            function highlightJson(json) {
              if (!json.trim()) return '';
              
              try {
                // 使用 highlight.js 进行高亮
                return hljs.highlight(json, {language: 'json'}).value;
              } catch (e) {
                return json;
              }
            }
            
            // 初始化事件监听器
            function initializeEventListeners() {
              // 路由过滤
              document.getElementById('route-filter').addEventListener('input', function() {
                const filter = this.value.toLowerCase();
                const rows = document.querySelectorAll('.route-row');
                
                rows.forEach(row => {
                  const path = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
                  if (path.includes(filter)) {
                    row.style.display = '';
                  } else {
                    row.style.display = 'none';
                  }
                });
              });
              
              // 测试按钮点击事件
              document.querySelectorAll('.test-api-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                  openTester(this.dataset.path, this.dataset.method);
                });
              });
              
              // 关闭测试器
              document.getElementById('close-tester').addEventListener('click', closeTester);
              document.getElementById('overlay').addEventListener('click', closeTester);
              
              // 发送请求
              document.getElementById('send-btn').addEventListener('click', sendRequest);
              
              // 标签页切换
              document.getElementById('params-tab-btn').addEventListener('click', function() {
                switchTab('params');
              });
              document.getElementById('headers-tab-btn').addEventListener('click', function() {
                switchTab('headers');
              });
              document.getElementById('body-tab-btn').addEventListener('click', function() {
                switchTab('body');
              });
              
              // 添加参数和请求头
              document.getElementById('add-param-btn').addEventListener('click', function() {
                addRow('params-container');
              });
              document.getElementById('add-header-btn').addEventListener('click', function() {
                addRow('headers-container');
              });
              
              // 删除参数和请求头
              document.querySelectorAll('.remove-param').forEach(btn => {
                btn.addEventListener('click', function() {
                  this.parentElement.remove();
                });
              });
              
              // JSON格式化
              document.getElementById('format-json-btn').addEventListener('click', function() {
                const textarea = document.getElementById('request-body');
                try {
                  const json = JSON.parse(textarea.value);
                  textarea.value = JSON.stringify(json, null, 2);
                } catch (e) {
                  alert('无效的JSON格式');
                }
              });
              
              // 复制响应
              document.getElementById('copy-response').addEventListener('click', function() {
                const output = document.getElementById('response-output');
                const text = output.textContent;
                
                navigator.clipboard.writeText(text)
                  .then(() => {
                    // 显示复制成功提示
                    const btn = this;
                    const originalText = btn.textContent;
                    btn.textContent = '已复制!';
                    setTimeout(() => {
                      btn.textContent = originalText;
                    }, 2000);
                  })
                  .catch(err => {
                    console.error('复制失败:', err);
                    alert('复制失败，请手动复制');
                  });
              });

              // 添加格式化JSON按钮功能
              document.getElementById('format-json').addEventListener('click', function() {
                const output = document.getElementById('response-output');
                try {
                  const json = JSON.parse(output.textContent);
                  const formatted = JSON.stringify(json, null, 2);
                  output.innerHTML = highlightJson(formatted);
                } catch (e) {
                  alert('无效的JSON格式');
                }
              });
            }
            
            function openTester(path, method) {
              document.getElementById('method-select').value = method;
              document.getElementById('url-input').value = path;
              document.getElementById('api-tester').style.display = 'block';
              document.getElementById('overlay').style.display = 'block';
              
              // 默认激活参数标签
              switchTab('params');
            }
            
            function closeTester() {
              document.getElementById('api-tester').style.display = 'none';
              document.getElementById('overlay').style.display = 'none';
            }
            
            function switchTab(tabName) {
              // 移除所有标签页的active类
              document.querySelectorAll('.tester-tab').forEach(tab => tab.classList.remove('active'));
              document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
              
              // 添加当前标签页的active类
              document.getElementById(tabName + '-tab-btn').classList.add('active');
              document.getElementById(tabName + '-tab').classList.add('active');
            }
            
            function addRow(containerId) {
              const container = document.getElementById(containerId);
              const row = document.createElement('div');
              row.className = 'param-row';
              
              row.innerHTML = \`
                <input type="text" class="tester-input" placeholder="\${containerId === 'params-container' ? '参数名' : '头部名称'}">
                <input type="text" class="tester-input" placeholder="\${containerId === 'params-container' ? '参数值' : '头部值'}">
                <button class="tester-btn remove-param">删除</button>
              \`;
              
              container.appendChild(row);
              
              // 为新添加的删除按钮绑定事件
              row.querySelector('.remove-param').addEventListener('click', function() {
                row.remove();
              });
            }
            
            function sendRequest() {
              const method = document.getElementById('method-select').value;
              const url = document.getElementById('url-input').value;
              const bodyText = document.getElementById('request-body').value;
              
              // 显示加载中
              document.getElementById('loading').style.display = 'inline-block';
              document.getElementById('send-btn').disabled = true;
              
              // 构建URL查询参数
              let finalUrl = url;
              if (method === 'GET' || method === 'HEAD') {
                const paramRows = document.getElementById('params-container').querySelectorAll('.param-row');
                const params = new URLSearchParams();
                
                paramRows.forEach(row => {
                  const inputs = row.querySelectorAll('input');
                  const key = inputs[0].value.trim();
                  const value = inputs[1].value.trim();
                  
                  if (key) {
                    params.append(key, value);
                  }
                });
                
                const queryString = params.toString();
                if (queryString) {
                  finalUrl += (url.includes('?') ? '&' : '?') + queryString;
                }
              }
              
              // 构建请求头
              const headers = {};
              const headerRows = document.getElementById('headers-container').querySelectorAll('.param-row');
              
              headerRows.forEach(row => {
                const inputs = row.querySelectorAll('input');
                const key = inputs[0].value.trim();
                const value = inputs[1].value.trim();
                
                if (key) {
                  headers[key] = value;
                }
              });
              
              // 构建请求选项
              const options = {
                method,
                headers,
                credentials: 'same-origin'
              };
              
              // 添加请求体（非GET/HEAD请求）
              if (method !== 'GET' && method !== 'HEAD' && bodyText.trim()) {
                // 检测Content-Type
                const contentType = headers['Content-Type'] || '';
                
                if (contentType.includes('application/json')) {
                  try {
                    // 尝试解析JSON
                    const jsonBody = JSON.parse(bodyText);
                    options.body = JSON.stringify(jsonBody);
                  } catch (e) {
                    // 如果解析失败，使用原始文本
                    options.body = bodyText;
                  }
                } else {
                  options.body = bodyText;
                }
              }
              
              // 记录开始时间
              const startTime = Date.now();
              
              // 发送请求
              fetch(finalUrl, options)
                .then(response => {
                  // 计算响应时间
                  const endTime = Date.now();
                  const duration = endTime - startTime;
                  
                  // 显示状态和时间
                  const statusElem = document.getElementById('status');
                  statusElem.textContent = \`状态: \${response.status} \${response.statusText}\`;
                  statusElem.className = response.ok ? 'status status-success' : 'status status-error';
                  
                  document.getElementById('response-time').textContent = \`响应时间: \${duration}ms\`;
                  
                  // 获取响应内容
                  return response.text().then(text => {
                    // 显示响应区域
                    document.getElementById('response-area').style.display = 'block';
                    
                    try {
                      // 尝试解析为JSON
                      const jsonData = JSON.parse(text);
                      const formattedJson = JSON.stringify(jsonData, null, 2);
                      
                      // 使用 highlight.js 高亮显示
                      document.getElementById('response-output').innerHTML = highlightJson(formattedJson);
                    } catch (e) {
                      // 如果不是JSON，直接显示文本
                      document.getElementById('response-output').textContent = text;
                    }
                  });
                })
                .catch(error => {
                  // 显示错误
                  document.getElementById('response-area').style.display = 'block';
                  document.getElementById('status').textContent = '错误: ' + error.message;
                  document.getElementById('status').className = 'status status-error';
                  document.getElementById('response-time').textContent = '';
                  document.getElementById('response-output').textContent = \`请求失败: \${error.message}\n\n可能的原因:\n- URL不正确\n- 服务器未响应\n- CORS限制\n- 网络连接问题\`;
                })
                .finally(() => {
                  // 隐藏加载中
                  document.getElementById('loading').style.display = 'none';
                  document.getElementById('send-btn').disabled = false;
                });
            }
          </script>
        </body>
      </html>
    `)
  })

  // 中间件调试路由
  app.get('/debug/middleware', (req, res) => {
    // 提取中间件信息
    const middlewareList = app._router.stack.map(middleware => ({
      name: middleware.name,
      type: middleware.route ? 'route' : (middleware.name === 'router' ? 'router' : 'middleware'),
      path: middleware.route ? middleware.route.path : (middleware.regexp ? middleware.regexp.toString() : 'unknown')
    }))

    res.json({
      count: middlewareList.length,
      middleware: middlewareList
    })
  })

  // API测试代理路由
  app.all('/debug/proxy/*', (req, res) => {
    const targetPath = req.url.replace('/debug/proxy/', '/')
    res.redirect(307, targetPath)
  })
}
