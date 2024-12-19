import http from 'http'
import https from 'https'
import os from 'os'
import fs from 'fs/promises'
import path from 'path'
import chalk from 'chalk'
import { pathToFileURL } from 'url'
import Redis from 'ioredis'
import { PluginPath } from '../components/Path.js'
import Config from '../components/Config.js'
import { RedisConfig } from '../components/Redis.js'

const redis = new Redis({
  host: RedisConfig.host,
  port: RedisConfig.port,
  username: RedisConfig.username,
  password: RedisConfig.password,
  db: 2
})

let config = Config.getConfig('api')
const apiHandlersCache = {}
const loadStats = { success: 0, failure: 0, totalTime: 0, routeTimes: [] }
const REDIS_STATS_KEY = 'MEMZ/API'

const updateRequestStats = async (ip, route) => {
  const normalizedIp = ip.replace(/:/g, '.')

  const ipKey = `${REDIS_STATS_KEY}:${normalizedIp}`

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

const getStats = async (req, res) => {
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

const healthCheck = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(
    JSON.stringify({
      status: '服务正常',
      time: new Date().toLocaleString()
    })
  )
}

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

const loadApiHandler = async (filePath, routePrefix = '') => {
  const route = `${routePrefix}/${path.basename(filePath, '.js')}`
  const startTime = Date.now()
  try {
    const handlerModule = await import(pathToFileURL(filePath))
    const handler = handlerModule.default

    if (typeof handler === 'function') {
      apiHandlersCache[route] = handler
      const loadTime = Date.now() - startTime
      loadStats.routeTimes.push({ route, time: loadTime })
      logger.debug(chalk.blueBright(`[MEMZ-API] API加载完成 路由: ${route}, 耗时: ${loadTime}ms`))
      loadStats.success++
    } else {
      logger.warn(chalk.yellow(`[MEMZ-API] API服务跳过无效文件: ${filePath}`))
      loadStats.failure++
    }
  } catch (err) {
    logger.error(chalk.red(`[memz-plugin] API加载失败: ${filePath}`), err.message)
    logger.debug(`[MEMZ-API] [加载调试] 错误详情: ${err.stack}`)
    loadStats.failure++
  }
}

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
  let ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress

  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '')
  }

  logger.debug(
    `[MEMZ-API] [请求调试] 收到请求: IP=${ip}, URL=${req.url}, Method=${req.method}, Headers=${JSON.stringify(req.headers)}`
  )

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

  if (route === '/health') return healthCheck(req, res)
  if (route === '/stats') return await getStats(req, res)
  if (route === '/favicon.ico') return await serveFavicon(req, res)

  const handler = apiHandlersCache[route]
  if (handler) {
    try {
      logger.info(`[MEMZ-API] [请求日志] IP: ${ip} 路由: ${route}`)
      await updateRequestStats(ip, route)

      if (config.corsenabled) {
        res.setHeader('Access-Control-Allow-Origin', config.corsorigin)
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      await handler(req, res)
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(`500 服务器内部错误：${err.message}`)
      logger.error(`[MEMZ-API] 路由: ${route} 错误: ${err.message}`)
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('404 未找到：接口不存在')
    logger.warn(`[MEMZ-API] [404] 路由不存在: ${route}`)
  }

  const endTime = Date.now()
  logger.info(`[MEMZ-API] [请求完成] IP: ${ip} 路由: ${route} 响应时间: ${endTime - startTime}ms`)
}

const startServer = async () => {
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

    server.listen(config.port, config.host, '::', async () => {
      const protocol = config.httpsenabled ? 'https' : 'http'

      try {
        const result = await getLocalIPs()
        logger.info('############################################################')
        logger.info(chalk.greenBright('MEMZ-API已使用 ' + (config.httpsenabled ? 'HTTPS' : 'HTTP') + ' 协议启动'))
        logger.info(chalk.blueBright('- 公网 IP 地址 '))
        logger.info(chalk.yellowBright(`- ${result.public}:${config.port}`))

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
        if (config.host) {
          let host = config.host.startsWith('http') ? config.host.replace(/^https?:\/\//, '') : config.host
          if (host === 'localhost' || host === '127.0.0.1') {
            host += `:${config.port}`
          }
          logger.info(chalk.magenta('- 自定义域名'))
          logger.info(chalk.yellowBright(`- ${protocol}://${host}`))
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

const handleServerError = (error) => {
  const errorMessages = {
    EADDRINUSE: `端口 ${config.port} 已被占用，请修改配置文件中的端口号或关闭占用该端口的程序。`,
    EACCES: `端口 ${config.port} 权限不足，请尝试使用管理员权限启动程序，或者修改为更高的端口号（>=1024）。`
  }
  const message = errorMessages[error.code] || `服务器运行时发生未知错误: ${error.message}`
  logger.error(chalk.red(message))
}

const handleStartupError = (error) => {
  if (error.code === 'ENOENT') {
    logger.error(`[MEMZ-API] 文件未找到: ${error.path}。请检查配置文件中的路径是否正确。`)
  } else {
    logger.error(`[MEMZ-API] 启动服务器时发生错误: ${error.message}`)
  }
}

export default startServer
