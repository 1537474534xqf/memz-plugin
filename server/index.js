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

let config = {}
const apiHandlersCache = {}
// 统计
let loadStats = {
  success: 0,
  failure: 0,
  totalTime: 0
}
// 加载配置
const loadConfig = async () => {
  try {
    config = Config.getConfig('api')
    logger.debug(chalk.green('[memz-plugin]API服务配置加载成功!', config))
  } catch (err) {
    logger.error(chalk.red('[memz-plugin]API服务配置加载失败'), err.message)
  }
}
await loadConfig()

const REDIS_STATS_KEY = 'MEMZ/API'

// 更新统计信息
const updateRequestStats = async (ip, route) => {
  const ipKey = `${REDIS_STATS_KEY}:${ip}`
  try {
    await redis.hincrby(ipKey, route, 1) // 路由請求次數
    await redis.hincrby(ipKey, 'total', 1) // 總請求次數
    await redis.expire(ipKey, 86400) // 设置过期时间为 1 天
  } catch (err) {
    logger.error(chalk.red(`[统计错误] 更新统计失败: IP=${ip}, Route=${route}, 错误=${err.message}`))
  }
}

// 获取 Redis 中的统计数据
const getStats = async (req, res) => {
  try {
    const keys = await redis.keys(`${REDIS_STATS_KEY}:*`)
    const stats = {}
    for (const key of keys) {
      const ipStats = await redis.hgetall(key)
      const ip = key.split(':').pop()
      stats[ip] = ipStats
    }
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
  res.end(JSON.stringify({
    status: '服务正常',
    time: new Date().toLocaleString()
  }))
}

// 加载API
const loadApiHandler = async (filePath) => {
  const baseName = path.basename(filePath, '.js')
  let route = `/${baseName}`
  try {
    const fileUrl = pathToFileURL(filePath)
    const handlerModule = await import(fileUrl)
    const handler = handlerModule.default

    if (typeof handler === 'function') {
      apiHandlersCache[route] = handler
      logger.info(chalk.blueBright(`[memz-plugin]API加载完成 路由: ${route}`))
      loadStats.success++
    } else {
      logger.warn(chalk.yellow(`[memz-plugin]API服务跳过无效文件: ${filePath}`))
      loadStats.failure++
    }
  } catch (err) {
    logger.error(chalk.red(`[memz-plugin]API加载失败: ${filePath}`), err.message)
    loadStats.failure++
  }
}
// 获取本地IP
const getLocalIPs = () => {
  const interfaces = os.networkInterfaces()
  const addresses = []
  for (const iface of Object.values(interfaces)) {
    iface.forEach(details => {
      if (details.family === 'IPv4' || details.family === 'IPv6') {
        addresses.push(details.address)
      }
    })
  }
  return addresses
}
// 请求处理
const handleRequest = async (req, res) => {
  const startTime = Date.now()
  const originalIP = req.socket.remoteAddress
  let ip

  if (originalIP.includes(':')) {
    if (originalIP.startsWith('::ffff:')) {
      ip = originalIP.replace('::ffff:', '')
    } else {
      // 如果是IPv6 地址，那就替换:为.,防止Redis分割(
      ip = originalIP.replace(/:/g, '.')
    }
  } else {
    ip = originalIP
  }

  // IP 黑名单
  if (config.blacklistedIPs.includes(ip)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('403 禁止访问：您的 IP 已被列入黑名单')
    logger.warn(`[黑名单 IP] ${ip}`)
    return
  }

  // IP 白名单
  if (config.whitelistedIPs.length > 0 && !config.whitelistedIPs.includes(ip)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('403 禁止访问：您的 IP 不在白名单中')
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)
  const route = url.pathname

  if (route === '/health') {
    healthCheck(req, res)
    return
  }

  if (route === '/stats') {
    await getStats(req, res)
    return
  }

  const handler = apiHandlersCache[route]
  if (handler) {
    try {
      logger.info(`[请求日志] IP:${ip} 路由:${route}`)
      await updateRequestStats(ip, route)

      if (config.corsenabled) {
        res.setHeader('Access-Control-Allow-Origin', config.corsorigin)
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      await handler(req, res)
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(`500 服务器内部错误：${err.message}`)
      logger.error(`[API错误] 路由: ${route} 错误: ${err.message}`)
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('404 未找到：接口不存在')
    logger.warn(`[404] 路由不存在: ${route}`)
  }

  const endTime = Date.now()
  logger.info(`[请求完成] IP: ${ip} 路由: ${route} 响应时间: ${endTime - startTime}ms`)
}

const startServer = async () => {
  try {
    const startTime = Date.now()

    const apiDir = path.join(PluginPath, 'server', 'api')
    const files = await fs.readdir(apiDir)
    for (const file of files) {
      if (file.endsWith('.js')) {
        await loadApiHandler(path.join(apiDir, file))
      }
    }
    loadStats.totalTime = Date.now() - startTime

    logger.info(chalk.green('MEMZ-API 服务载入完成'))
    logger.info(chalk.greenBright(`成功加载：${loadStats.success} 个`))
    logger.info(chalk.yellowBright(`加载失败：${loadStats.failure} 个`))
    logger.info(chalk.cyanBright(`总耗时：${loadStats.totalTime} 毫秒`))

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

    server.listen(config.port, '::', () => {
      const protocol = config.httpsenabled ? 'https' : 'http'
      const ips = getLocalIPs()
      logger.info('#######################################################')
      logger.info(chalk.greenBright('- MEMZ-API 服务器已启动'))
      ips.forEach(ip => {
        const formattedIP = ip.includes(':') ? `[${ip}]` : ip
        logger.info(chalk.blueBright(`- ${protocol}://${formattedIP}:${config.port}`))
      })
      logger.info('#######################################################')
    })

    return server
  } catch (error) {
    handleStartupError(error)
  }
}

// 错误处理
const handleServerError = (error) => {
  logger.error('[MEMZ-API]API 服务启动失败')
  const errorMessages = {
    EADDRINUSE: `端口 ${config.port} 已被占用，请修改配置文件中的端口号或关闭占用该端口的程序。`,
    EACCES: `端口 ${config.port} 权限不足，请尝试使用管理员权限启动程序，或者修改为更高的端口号（>=1024）。`,
    ENOTFOUND: '无法找到指定的主机，请检查配置文件中的主机地址是否正确。',
    EADDRNOTAVAIL: '绑定的地址无效，无法在当前环境下使用。请检查配置文件中的地址设置。',
    ENOTDIR: '指定的文件路径无效，请检查配置文件的路径设置是否正确。',
    EPERM: '操作权限不足，无法完成请求。请检查相关权限或以管理员权限运行。',
    EPIPE: '管道错误，可能是连接中断或写入无效数据。',
    ECONNREFUSED: '连接被拒绝，请检查网络状态或目标服务器是否可达。',
    ECONNRESET: '连接被对方重置，可能是远程服务器的问题。',
    ETIMEOUT: '连接超时，请检查网络设置或目标服务器响应速度。'
  }
  const message = errorMessages[error.code] || `服务器运行时发生未知错误: ${error.message}`
  logger.error(chalk.red(message))
}
const handleStartupError = (error) => {
  if (error.code === 'ENOENT') {
    logger.error(`文件未找到: ${error.path}。请检查配置文件中的路径是否正确。`)
  } else if (error instanceof ReferenceError && error.message === 'server is not defined') {
    logger.error('未能成功定义服务器，请检查相关配置或初始化顺序。')
  } else {
    logger.error(`启动服务器时发生错误: ${error.message}`)
  }
}

export default startServer
