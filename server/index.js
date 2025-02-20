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
import { generateMarkdownDocs, clearApiDocsCache } from './model/apiDocs.js'
import chokidar from 'chokidar'

// 导入前端页面处理函数
import { web } from './web/index.js'

const config = Config.getConfig('api')

// 创建Redis客户端
let redis = null
let redisAvailable = false

// 初始化Redis连接
async function initRedis () {
  if (!config.redisEnabled) {
    logger.info(chalk.yellow('[Redis] Redis功能已禁用'))
    return
  }

  try {
    redis = new Redis({
      host: config.redisHost || RedisConfig.host || 'localhost',
      port: config.redisPort || RedisConfig.port || 6379,
      username: config.redisUsername || RedisConfig.username || '',
      password: config.redisPassword || RedisConfig.password || '',
      db: config.redisDB || RedisConfig.db || 2,
      connectTimeout: 5000, // 5秒连接超时
      retryStrategy: (times) => {
        if (times > 3) {
          return false // 3次重试后放弃
        }
        return Math.min(times * 1000, 3000)
      }
    })

    redis.on('connect', () => {
      redisAvailable = true
      logger.info(chalk.green('[Redis] 连接成功'))
    })

    redis.on('error', (err) => {
      redisAvailable = false
      logger.warn(chalk.yellow(`[Redis] 连接失败: ${err.message}`))
      logger.warn(chalk.yellow('[Redis] 统计功能将被禁用'))
    })

    // 测试连接
    await redis.ping()
    redisAvailable = true
  } catch (err) {
    redisAvailable = false
    logger.warn(chalk.yellow(`[Redis] 初始化失败: ${err.message}`))
    logger.warn(chalk.yellow('[Redis] 统计功能将被禁用'))
  }
}

const apiHandlersCache = {}
const loadStats = { success: 0, failure: 0, totalTime: 0, routeTimes: [] }
const REDIS_STATS_KEY = 'MEMZ/API'

// 开发模式监听器
let watcher = null

// 重载单个API模块
async function reloadApiModule (filePath) {
  try {
    const relativePath = path.relative(path.join(PluginPath, 'server', 'api'), filePath)
    const route = '/' + relativePath.replace(/\\/g, '/').replace(/\.js$/, '')

    // 清除模块缓存
    const moduleUrl = pathToFileURL(filePath).href
    delete apiHandlersCache[route]
    clearApiDocsCache()

    // 重新加载模块
    const startTime = Date.now()
    const handlerModule = await import(`${moduleUrl}?update=${Date.now()}`)
    const handler = handlerModule.default

    if (typeof handler === 'function') {
      apiHandlersCache[route] = handler
      const loadTime = Date.now() - startTime

      logger.info(chalk.green(`[DEV] 重载模块成功: ${route}`))
      logger.info(chalk.blue(`[DEV] 重载耗时: ${loadTime}ms`))

      // 输出模块信息
      const moduleInfo = {
        title: handlerModule.title,
        method: handlerModule.method || 'GET',
        params: handlerModule.key || {},
        description: handlerModule.description
      }
      logger.info(chalk.cyan('[DEV] 模块信息:'))
      logger.info(chalk.cyan(JSON.stringify(moduleInfo, null, 2)))

      // 重新生成文档
      const apiDoc = await generateMarkdownDocs()
      await fs.writeFile(path.join(PluginPath, 'API.md'), apiDoc, 'utf8')
    } else {
      logger.warn(chalk.yellow(`[DEV] 模块 ${route} 未导出有效的处理函数`))
    }
  } catch (error) {
    logger.error(chalk.red(`[DEV] 重载模块失败: ${error.message}`))
    logger.error(chalk.red(error.stack))
  }
}

// 启动开发模式监听
function startDevMode () {
  const apiDir = path.join(PluginPath, 'server', 'api')

  logger.info(chalk.green('[DEV] 开发模式已启动'))
  logger.info(chalk.blue(`[DEV] 监听目录: ${apiDir}`))

  watcher = chokidar.watch(apiDir, {
    ignored: /(^|[/\\])\../, // 忽略隐藏文件
    persistent: true,
    ignoreInitial: true
  })

  watcher
    .on('change', async filePath => {
      logger.info(chalk.yellow(`[DEV] 检测到文件变更: ${filePath}`))
      await reloadApiModule(filePath)
    })
    .on('add', async filePath => {
      logger.info(chalk.yellow(`[DEV] 检测到新文件: ${filePath}`))
      await reloadApiModule(filePath)
    })
    .on('unlink', async filePath => {
      const relativePath = path.relative(apiDir, filePath)
      const route = '/' + relativePath.replace(/\\/g, '/').replace(/\.js$/, '')

      delete apiHandlersCache[route]
      logger.info(chalk.yellow(`[DEV] 移除模块: ${route}`))

      // 重新生成文档
      const apiDoc = await generateMarkdownDocs()
      await fs.writeFile(path.join(PluginPath, 'API.md'), apiDoc, 'utf8')
      logger.info(chalk.green('[DEV] API文档已更新'))
    })
    .on('error', error => {
      logger.error(chalk.red(`[DEV] 监听错误: ${error}`))
    })
}

// 停止开发模式监听
function stopDevMode () {
  if (watcher) {
    watcher.close()
    watcher = null
    logger.info(chalk.yellow('[DEV] 开发模式已停止'))
  }
}

// 生成Token
if (config.token === '') {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const length = 32 // 32是不是有点大?
  logger.warn(chalk.yellow('[Token] Token 未设置，将自动生成一个随机 Token'))
  let token = ''
  for (let i = 0; i < length; i++) {
    token += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  Config.modify('api', 'token', token)
}

// 更新请求统计的函数改为可选
const updateRequestStats = async (ip, route) => {
  if (!redisAvailable) return

  const normalizedIp = ip.replace(/:/g, '.')
  const ipKey = `${REDIS_STATS_KEY}:Stats:${normalizedIp}`

  try {
    const pipeline = redis.multi()
    pipeline.hincrby(ipKey, route, 1)
    pipeline.hincrby(ipKey, 'total', 1)

    if (config.redisExpire > 0) {
      pipeline.expire(ipKey, config.redisExpire)
    }

    await pipeline.exec()
  } catch (err) {
    logger.debug(`[请求统计] Redis更新失败: ${err.message}`)
  }
}

// 修改鉴权检查函数
export const checkAuthAndBlacklist = async (req, res, token) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

  // 如果Redis不可用,只检查token
  if (!redisAvailable) {
    if (token !== config.token) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: '无效的访问令牌' }))
      return false
    }
    return true
  }

  // Redis可用时
  try {
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
  } catch (err) {
    // Redis出错时只检查token
    logger.debug(`[鉴权检查] Redis操作失败: ${err.message}`)
    if (token !== config.token) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: '无效的访问令牌' }))
      return false
    }
    return true
  }
}

// 获取统计信息
const getStats = async (req, res) => {
  if (!redisAvailable) {
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: 'Redis服务不可用,统计功能已禁用' }))
    return
  }

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
    logger.error(chalk.red(`[统计错误] 获取统计信息失败: ${err.message}`))
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: '获取统计信息失败', details: err.message }))
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
    logger.warn(`[favicon] 加载失败: ${err.message}`)
  }
}

// 加载 API 服务
const loadApiHandler = async (filePath, routePrefix = '') => {
  const route = `${routePrefix}/${path.basename(filePath, '.js')}`
  const startTime = Date.now()

  // 初始化 apiList 数组
  if (!global.apiList) {
    global.apiList = []
  }

  // 黑名单API
  if (config.blackApiList.includes(route)) {
    logger.info(chalk.yellow(`API加载跳过[黑名单]: ${route}`))
    loadStats.skipped = (loadStats.skipped || 0) + 1
    return
  }

  try {
    const handlerModule = await import(pathToFileURL(filePath))
    const handler = handlerModule.default

    if (typeof handler === 'function') {
      apiHandlersCache[route] = handler
      global.apiList.push({ path: route, title: handlerModule.title || null }) // 将路由存储到 apiList

      const loadTime = Date.now() - startTime
      loadStats.routeTimes.push({ route, time: loadTime })

      // 加载成功
      logger.debug(chalk.blueBright(`API加载完成 路由: ${route}, 耗时: ${loadTime}ms`))
      loadStats.success++
    } else {
      // 无效文件
      logger.warn(chalk.yellow(`API服务跳过无效文件: ${filePath}`))
      loadStats.failure++
    }
  } catch (err) {
    // 捕获错误的堆栈信息
    const stackTrace = err.stack ? err.stack.split('\n') : []
    stackTrace.forEach(line => {
      if (line.includes('at ')) {
        logger.error(chalk.red(`错误位置: ${line}`))
      }
    })

    logger.error(`[加载调试] 错误详情:\n${err.stack}`)

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
async function getPublicIP () {
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

  logger.debug(`[请求调试] 收到请求: IP=${ip}, URL=${req.url}, Method=${req.method}, Headers=${JSON.stringify(req.headers)}`)

  // 黑名单和白名单检查
  if (config.blacklistedIPs.includes(ip)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('403 禁止访问：您的 IP 已被列入黑名单')
    logger.warn(`[黑名单 IP] ${ip}`)
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
    const log = [`[请求日志] IP: ${ip} 路由: ${route}`]
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
    logger.warn(`[404] 路由不存在: ${route}`)
  }

  const endTime = Date.now()
  logger.info(`[请求完成] IP: ${ip} 路由: ${route} 响应时间: ${endTime - startTime}ms`)
}

// 启动服务
export async function startServer () {
  try {
    await initRedis() // 添加Redis初始化

    const startTime = Date.now()

    const apiDir = path.join(PluginPath, 'server', 'api')
    await loadApiHandlersRecursively(apiDir)

    loadStats.totalTime = Date.now() - startTime

    logger.info(chalk.greenBright('**********************************'))
    logger.info(chalk.green('MEMZ-API 服务载入完成'))
    logger.info(chalk.greenBright(`成功加载：${loadStats.success} 个`))
    logger.info(chalk.yellowBright(`加载失败：${loadStats.failure} 个`))
    logger.info(chalk.greenBright(`黑名单列表：${loadStats.skipped} 个`))
    logger.info(chalk.cyanBright(`总耗时：${loadStats.totalTime} 毫秒`))
    loadStats.routeTimes.forEach(({ route, time }) => {
      logger.info(chalk.magentaBright(`路由: ${route}, 加载时间: ${time}ms`))
    })
    logger.info(chalk.greenBright('**********************************'))

    // 生成API文档
    const apiDoc = await generateMarkdownDocs()
    await fs.writeFile(path.join(PluginPath, 'API.md'), apiDoc, 'utf8')

    // 启动开发模式
    if (config.dev) {
      startDevMode()
    }

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

    // 添加关闭处理
    process.on('SIGINT', () => {
      stopDevMode()
      server.close()
      process.exit()
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
    logger.error(`文件未找到: ${error.path}。请检查配置文件中的路径是否正确。`)
  } else {
    logger.error(`启动服务器时发生错误: ${error.message}`)
  }
}

// 如果是单跑就直接启动服务器
if (!isFramework) {
  startServer()
}
