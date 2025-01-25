import logger from './lib/logger.js'
import http from 'http'
import https from 'https'
import os from 'os'
import fs from 'fs/promises'
import path from 'path'
import chalk from 'chalk'
import { pathToFileURL } from 'url'
import Redis from 'ioredis'
import { PluginPath, isFramework } from '../components/Path.js'
import Config from '../components/Config.js'
import { RedisConfig } from '../components/Redis.js'
import { generateApiDocs, generateMarkdownDocs } from './model/apiDocs.js'

const config = Config.getConfig('api')

const redis = new Redis({
  host: config.redisHost || RedisConfig.host || 'localhost',
  port: config.redisPort || RedisConfig.port || 6379,
  username: config.redisUsername || RedisConfig.username || '',
  password: config.redisPassword || RedisConfig.password || '',
  db: config.redisDB || RedisConfig.db || 2
})

const apiHandlersCache = {}
const loadStats = { success: 0, failure: 0, totalTime: 0, routeTimes: [] }
const REDIS_STATS_KEY = 'MEMZ/API'

// 生成Token
if (config.token === '') {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const length = 32 // 32是不是有点大?
  logger.warn(chalk.yellow('[MEMZ-API] [Token] Token 未设置，将自动生成一个随机 Token'))
  let token = ''
  for (let i = 0; i < length; i++) {
    token += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  Config.modify('api', 'token', token)
}

// 日志记录
const updateRequestStats = async (ip, route) => {
  const normalizedIp = ip.replace(/:/g, '.')

  const ipKey = `${REDIS_STATS_KEY}:Stats:${normalizedIp}`

  const pipeline = redis.multi()

  try {
    pipeline.hincrby(ipKey, route, 1)
    pipeline.hincrby(ipKey, 'total', 1)

    if (config.redisExpire > 0) {
      pipeline.expire(ipKey, config.redisExpire)
    }

    await pipeline.exec()
  } catch (err) {
    logger.error(chalk.red(`[MEMZ-API] [请求统计错误] 更新统计失败: IP=${ip}, Route=${route}, 错误=${err.message}`))
  }
}
/**
 * 鉴权并检查 IP 是否黑名单
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {string} token 请求中的 token
 * @returns {Promise<boolean>} 如果鉴权失败返回 false，否则返回 true
 */
export const checkAuthAndBlacklist = async (req, res, token) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

  // IP黑名单检查
  const blacklisted = await redis.sismember(`${REDIS_STATS_KEY}:blacklistedIPs`, ip)
  if (blacklisted) {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: '您的IP已被黑名单限制访问' }))
    return false
  }

  // 检查失败次数
  const failKey = `${REDIS_STATS_KEY}:fail_attempts:${ip}`
  const failData = await redis.hgetall(failKey)

  // 获取失败次数
  let failCount = 0
  if (failData && failData.count) {
    failCount = parseInt(failData.count, 10)
  }

  // 如果失败次数达到设定次数且时间在设定窗口内，则返回限制
  if (failCount >= config.maxFailAttempts && Date.now() - failData.timestamp < config.timeWindow) {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: `多次失败尝试，您的IP已被临时限制访问（超过 ${config.maxFailAttempts} 次失败，限制时长 ${config.timeWindow / 1000 / 60} 分钟）` }))
    return false
  }

  // token 验证
  if (token !== config.token) {
    if (failData) {
      failCount = failCount + 1
      await redis.hset(failKey, 'count', failCount, 'timestamp', Date.now())
    } else {
      await redis.hset(failKey, 'count', 1, 'timestamp', Date.now())
    }

    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: '无效的访问令牌' }))
    return false
  }

  if (failData) {
    await redis.del(failKey)
  }

  return true
}

// 获取统计信息
const getStats = async (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http')
  const parsedUrl = new URL(req.url, `${protocol}://${req.headers.host}`)

  const token = parsedUrl.searchParams.get('token')

  const isAuthorized = await checkAuthAndBlacklist(req, res, token)
  if (!isAuthorized) return

  try {
    const keys = await redis.keys(`${REDIS_STATS_KEY}:*`)
    const statsPromises = keys.map(async (key) => ({
      [key.split(':').pop()]: await redis.hgetall(key)
    }))
    const stats = Object.assign({}, ...(await Promise.all(statsPromises)))

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(stats, null, 2))
  } catch (err) {
    logger.error(chalk.red(`[MEMZ-API] [统计错误] 获取统计信息失败: ${err.message}`))
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: '获取统计信息失败', details: err.message }))
  }
}

// 前端页面
const web = async (req, res) => {
  try {
    const apiDocs = await generateApiDocs()
    
    // 递归生成HTML
    const generateApiHtml = (apis, level = 0) => {
      let html = ''
      for (const [key, value] of Object.entries(apis)) {
        if (value.path) {
          // API卡片
          html += `
            <div class="card">
              <div class="card-header">
                <h2>${value.title}</h2>
                <span class="method ${value.method.toLowerCase()}">${value.method}</span>
              </div>
              <div class="card-body">
                <div class="info-section">
                  <div class="info-row">
                    <span class="label">路径:</span>
                    <code class="path">${value.path}</code>
                  </div>
                  ${value.description ? `
                    <div class="info-row">
                      <span class="label">说明:</span>
                      <span class="description">${value.description}</span>
                    </div>
                  ` : ''}
                </div>
                ${value.params?.length > 0 ? `
                  <div class="params-section">
                    <div class="params-header">参数列表</div>
                    <div class="params-list">
                      ${value.params.map(param => `
                        <div class="param-item">
                          <div class="param-name-wrap">
                            <code class="param-name">${param.name}</code>
                            ${param.required ? '<span class="badge required">必填</span>' : '<span class="badge optional">可选</span>'}
                          </div>
                          <div class="param-desc">${param.description}</div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>
          `
        } else {
          // 分类标题
          html += `
            <div class="category-section">
              <div class="category-header">
                <h${level + 2}>${key.charAt(0).toUpperCase() + key.slice(1)} 相关接口</h${level + 2}>
              </div>
              <div class="category-content">
                ${generateApiHtml(value, level + 1)}
              </div>
            </div>
          `
        }
      }
      return html
    }

    // 样式优化
    const styles = `
      :root {
        --primary-color: #3498db;
        --success-color: #2ecc71;
        --warning-color: #f1c40f;
        --danger-color: #e74c3c;
        --text-color: #2c3e50;
        --border-color: #eee;
        --bg-color: #f8f9fa;
        --card-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background-color: var(--bg-color);
        background-image: url('https://image.admilk.us.kg/image/imgs/20241213144637342.png');
        background-size: cover;
        background-position: center;
        background-attachment: fixed;
        color: var(--text-color);
        line-height: 1.6;
        padding: 20px;
        min-height: 100vh;
      }

      .container {
        max-width: 1200px;
        margin: 0 auto;
        background-color: rgba(255, 255, 255, 0.95);
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(10px);
        padding: 30px;
      }

      h1 {
        text-align: center;
        margin-bottom: 40px;
        font-size: 2.5em;
        color: var(--text-color);
      }

      .category-section {
        margin-bottom: 40px;
      }

      .category-header h2,
      .category-header h3,
      .category-header h4 {
        color: var(--text-color);
        border-bottom: 2px solid var(--border-color);
        padding-bottom: 10px;
        margin-bottom: 20px;
      }

      .category-content {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 20px;
        grid-auto-rows: 1fr; /* 确保每行高度一致 */
      }

      .card {
        background: white;
        border-radius: 8px;
        box-shadow: var(--card-shadow);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden; /* 防止内容溢出 */
      }

      .card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
      }

      .card-header {
        padding: 15px 20px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(52, 152, 219, 0.05);
      }

      .card-header h2 {
        font-size: 1.2em;
        margin: 0;
        color: var(--text-color);
      }

      .card-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        flex: 1;
        min-height: 0; /* 允许内容收缩 */
      }

      .info-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .info-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }

      .label {
        font-weight: 500;
        color: var(--text-color);
        white-space: nowrap;
      }

      code {
        background: var(--bg-color);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'SFMono-Regular', Consolas, monospace;
        font-size: 0.9em;
      }

      .path {
        color: var(--primary-color);
        word-break: break-all;
      }

      .params-section {
        border-top: 1px solid var(--border-color);
        padding-top: 15px;
        margin-top: auto;
      }

      .params-header {
        font-weight: 500;
        margin-bottom: 12px;
        color: var(--text-color);
      }

      .params-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow-y: auto;
        max-height: 200px;
      }

      .param-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 8px;
        background: var(--bg-color);
        border-radius: 6px;
      }

      .param-name-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .param-name {
        color: #e83e8c;
      }

      .param-desc {
        color: #666;
        font-size: 0.9em;
        word-break: break-word;
      }

      .method {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.8em;
        font-weight: 500;
        white-space: nowrap;
      }

      .method.get { background: #e3f2fd; color: #1976d2; }
      .method.post { background: #e8f5e9; color: #388e3c; }
      .method.put { background: #fff3e0; color: #f57c00; }
      .method.delete { background: #ffebee; color: #d32f2f; }

      .badge {
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.75em;
        font-weight: 500;
      }

      .badge.required {
        background: #ffebee;
        color: #d32f2f;
      }

      .badge.optional {
        background: #f5f5f5;
        color: #757575;
      }

      @media (max-width: 768px) {
        body { padding: 10px; }
        .container { padding: 15px; }
        .category-content { 
          grid-template-columns: 1fr;
          grid-auto-rows: auto;
        }
        .card-header { 
          flex-direction: column; 
          gap: 10px; 
          align-items: flex-start;
        }
      }
    `

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MEMZ-API 服务列表</title>
        <style>${styles}</style>
      </head>
      <body>
        <div class="container">
          <h1>MEMZ-API 服务列表</h1>
          ${generateApiHtml(apiDocs)}
        </div>
      </body>
      </html>
    `)
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('生成API文档页面失败: ' + error.message)
  }
}

// 健康检查
const healthCheck = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(
    JSON.stringify({
      status: '服务正常',
      time: new Date().toLocaleString()
    })
  )
}

// 获取favicon
const serveFavicon = async (req, res) => {
  try {
    const faviconPath = path.join(PluginPath, 'server', 'favicon.ico')
    const favicon = await fs.readFile(faviconPath)
    res.writeHead(200, { 'Content-Type': 'image/x-icon' })
    res.end(favicon)
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('404 未找到：favicon.ico')
    logger.warn(`[MEMZ-API] [favicon] 加载失败: ${err.message}`)
  }
}

// 加载 API 服务
const loadApiHandler = async (filePath, routePrefix = '') => {
  const route = `${routePrefix}/${path.basename(filePath, '.js')}`
  const startTime = Date.now()

  try {
    const handlerModule = await import(pathToFileURL(filePath))
    const handler = handlerModule.default

    // 判断模块是否为有效的处理函数
    if (typeof handler === 'function') {
      apiHandlersCache[route] = handler
      const loadTime = Date.now() - startTime
      loadStats.routeTimes.push({ route, time: loadTime })

      // 加载成功
      logger.debug(chalk.blueBright(`[MEMZ-API] API加载完成 路由: ${route}, 耗时: ${loadTime}ms`))
      loadStats.success++
    } else {
      // 无效文件
      logger.warn(chalk.yellow(`[MEMZ-API] API服务跳过无效文件: ${filePath}`))
      loadStats.failure++
    }
  } catch (err) {
    // 捕获错误的堆栈信息
    const stackTrace = err.stack ? err.stack.split('\n') : []
    stackTrace.forEach(line => {
      if (line.includes('at ')) {
        logger.error(chalk.red(`[MEMZ-API] 错误位置: ${line}`))
      }
    })

    logger.error(`[MEMZ-API] [加载调试] 错误详情:\n${err.stack}`)

    loadStats.failure++
  }
}

// 递归加载 API 服务
const loadApiHandlersRecursively = async (directory, routePrefix = '') => {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const loadPromises = entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      return loadApiHandlersRecursively(fullPath, `${routePrefix}/${entry.name}`)
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      return loadApiHandler(fullPath, routePrefix)
    }
  })
  await Promise.all(loadPromises)
}
// 获取公网 IP
async function getPublicIP() {
  const apiUrls = [
    'https://v4.ip.zxinc.org/info.php?type=json',
    'https://ipinfo.io/json'
  ]

  for (const apiUrl of apiUrls) {
    try {
      const response = await fetch(apiUrl)
      const data = await response.json()
      const ip = apiUrl === 'https://v4.ip.zxinc.org/info.php?type=json'
        ? data?.data?.myip
        : data?.ip

      logger.debug(`从 ${apiUrl} 获取的公网 IP: ${ip}`)

      if (ip) {
        return ip
      } else {
        logger.debug(`未从 ${apiUrl} 获取到公网 IP`)
      }
    } catch (error) {
      logger.error(`无法从 ${apiUrl} 获取公网 IP`, error)
    }
  }

  logger.debug('所有 API 请求都失败，返回空的公网 IP')
  return ''
}

// 获取本地IP
const getLocalIPs = async () => {
  const localIPs = Object.values(os.networkInterfaces())
    .flat()
    .filter((details) => details.family === 'IPv4' || details.family === 'IPv6')
    .map((details) => details.address)

  const publicIP = await getPublicIP()

  return {
    local: localIPs,
    public: publicIP
  }
}
const handleRequest = async (req, res) => {
  const startTime = Date.now()
  let ip
  if (config.cdn) {
    ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress
  } else {
    ip = req.socket.remoteAddress || req.headers['x-forwarded-for'] || req.headers['x-real-ip']
  }

  // 处理多个 X-Forwarded-For 头部中的多个 IP 地址，取最右边的 IP
  if (ip && ip.includes(',')) {
    ip = ip.split(',').pop().trim()
  }

  // 如果 IP 是 IPv6 映射的 IPv4 地址，去掉 "::ffff:" 前缀
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '')
  }

  logger.debug(`[${config.port}][MEMZ-API] [请求调试] 收到请求: IP=${ip}, URL=${req.url}, Method=${req.method}, Headers=${JSON.stringify(req.headers)}`)

  // 黑名单和白名单检查
  if (config.blacklistedIPs.includes(ip)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('403 禁止访问：您的 IP 已被列入黑名单')
    logger.warn(`[MEMZ-API] [黑名单 IP] ${ip}`)
    return
  }

  if (config.whitelistedIPs.length > 0 && !config.whitelistedIPs.includes(ip)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('403 禁止访问：您的 IP 不在白名单中')
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)
  const route = url.pathname

  // 记录请求日志
  const logRequest = async (route, ip) => {
    const log = [`[${config.port}][MEMZ-API] [请求日志] IP: ${ip} 路由: ${route}`]
    const queryParams = new URLSearchParams(url.search)
    if ([...queryParams].length > 0) {
      const paramString = [...queryParams].map(([key, value]) => `${key}:${value}`).join(',')
      log.push(`参数: ${paramString}`)
    }
    logger.info(log.join(' '))
    await updateRequestStats(ip, route)
  }

  // 路由处理
  if (route === '/') {
    logRequest(route, ip)
    return web(req, res)
  }

  if (route === '/health') {
    logRequest(route, ip)
    return healthCheck(req, res)
  }

  if (route === '/stats') {
    logRequest(route, ip)
    return await getStats(req, res)
  }

  if (route === '/favicon.ico') {
    logRequest(route, ip)
    return await serveFavicon(req, res)
  }

  const handler = apiHandlersCache[route]
  if (handler) {
    try {
      logRequest(route, ip)

      if (config.corsenabled) {
        res.setHeader('Access-Control-Allow-Origin', config.corsorigin)
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8')

      await handler(req, res)
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(`500 服务器内部错误：${err.message}`)
      logger.error(`[${config.port}][MEMZ-API] 路由: ${route} 错误: ${err.message}`)
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('404 未找到：接口不存在')
    logger.warn(`[${config.port}][MEMZ-API] [404] 路由不存在: ${route}`)
  }

  const endTime = Date.now()
  logger.info(`[${config.port}][MEMZ-API] [请求完成] IP: ${ip} 路由: ${route} 响应时间: ${endTime - startTime}ms`)
}

// 启动服务
export async function startServer() {
  try {
    const startTime = Date.now()

    const apiDir = path.join(PluginPath, 'server', 'api')
    await loadApiHandlersRecursively(apiDir)

    loadStats.totalTime = Date.now() - startTime

    logger.info(chalk.greenBright('**********************************'))
    logger.info(chalk.green('MEMZ-API 服务载入完成'))
    logger.info(chalk.greenBright(`成功加载：${loadStats.success} 个`))
    logger.info(chalk.yellowBright(`加载失败：${loadStats.failure} 个`))
    logger.info(chalk.cyanBright(`总耗时：${loadStats.totalTime} 毫秒`))
    loadStats.routeTimes.forEach(({ route, time }) => {
      logger.info(chalk.magentaBright(`路由: ${route}, 加载时间: ${time}ms`))
    })
    logger.info(chalk.greenBright('**********************************'))

    // 生成API文档
    const apiDoc = await generateMarkdownDocs()
    await fs.writeFile(path.join(PluginPath, 'API.md'), apiDoc, 'utf8')

    const serverOptions = config.httpsenabled
      ? {
        key: await fs.readFile(config.httpskey),
        cert: await fs.readFile(config.httpscert)
      }
      : {}

    const server = config.httpsenabled
      ? https.createServer(serverOptions, handleRequest)
      : http.createServer(handleRequest)

    server.on('error', handleServerError)

    server.listen(config.port, config.host || '0.0.0.0', '::', async () => {
      const protocol = config.httpsenabled ? 'https' : 'http'

      try {
        const result = await getLocalIPs()
        logger.info('############################################################')
        logger.info(chalk.greenBright('MEMZ-API 已使用 ' + (config.httpsenabled ? 'HTTPS' : 'HTTP') + ' 协议启动'))
        logger.info(chalk.blueBright('- 公网 IP 地址 '))
        logger.info(chalk.yellowBright(`- ${protocol}://${result.public}:${config.port}`))

        if (result.local.length > 0) {
          const ipv4 = result.local.filter((ip) => !ip.includes(':'))
          const ipv6 = result.local.filter((ip) => ip.includes(':'))

          if (ipv4.length > 0) {
            logger.info(chalk.magentaBright('- 本地 IPv4 地址'))
            ipv4.forEach((ip) => {
              const formattedIP = ip.includes(':') ? `[${ip}]` : ip
              logger.info(chalk.yellowBright(`- ${protocol}://${formattedIP}:${config.port}`))
            })
          }
          if (ipv6.length > 0) {
            logger.info(chalk.cyanBright('- 本地 IPv6 地址'))
            ipv6.forEach((ip) => {
              const formattedIP = ip.includes(':') ? `[${ip}]` : ip
              logger.info(chalk.yellowBright(`- ${protocol}://${formattedIP}:${config.port}`))
            })
          }
        }
        if (config.apidomain) {
          let apidomain = config.apidomain.startsWith('http') ? config.apidomain.replace(/^https?:\/\//, '') : config.apidomain
          if (apidomain === 'localhost' || apidomain === '127.0.0.1') {
            apidomain += `:${config.port}`
          }
          logger.info(chalk.magenta('- 自定义域名'))
          logger.info(chalk.yellowBright(`- ${protocol}://${apidomain}`))
          logger.info('############################################################')
        }
      } catch (error) {
        logger.error(chalk.red('获取本地 IP 地址时出错:', error))
      }
    })

    return server
  } catch (error) {
    handleStartupError(error)
  }
}

// 处理服务器错误
const handleServerError = (error) => {
  const errorMessages = {
    EADDRINUSE: `端口 ${config.port} 已被占用，请修改配置文件中的端口号或关闭占用该端口的程序。`,
    EACCES: `端口 ${config.port} 权限不足，请尝试使用管理员权限启动程序，或者修改为更高的端口号（>=1024）。`
  }
  const message = errorMessages[error.code] || `服务器运行时发生未知错误: ${error.message}`
  logger.error(chalk.red(message))
}

// 处理启动错误
const handleStartupError = (error) => {
  if (error.code === 'ENOENT') {
    logger.error(`[MEMZ-API] 文件未找到: ${error.path}。请检查配置文件中的路径是否正确。`)
  } else {
    logger.error(`[MEMZ-API] 启动服务器时发生错误: ${error.message}`)
  }
}

// 如果是单跑就直接启动服务器
if (!isFramework) {
  startServer()
}
