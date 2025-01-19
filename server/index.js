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

let config = Config.getConfig('api')

const redis = new Redis({
  host: config.redisHost || RedisConfig.host || 'localhost',
  port: config.redisPort || RedisConfig.port || 6379,
  username: config.redisUsername || RedisConfig.username || '',
  password: config.redisPassword || RedisConfig.password || '',
  db: config.redisDB || RedisConfig.db || 2
});

const apiHandlersCache = {}
const loadStats = { success: 0, failure: 0, totalTime: 0, routeTimes: [] }
const REDIS_STATS_KEY = 'MEMZ/API'

// 生成Token
if (config.token == "") {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 32; // 32是不是有点大?
  logger.warn(chalk.yellow('[MEMZ-API] [Token] Token 未设置，将自动生成一个随机 Token'))
  let token = '';
  for (let i = 0; i < length; i++) {
    token += characters.charAt(Math.floor(Math.random() * characters.length));
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

// 简单的前端处理
const escapeHtml = (str) => {
  return str.replace(/[&<>"']/g, (match) => {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return escapeMap[match]
  })
}

// 前端页面
const web = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })

  let { apiList } = Config.getConfig('api')

  let htmlContent = `
    <html>
    <head>
      <title>MEMZ-API 服务列表</title>
      <style>
        /* 页面整体样式 */
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f4f7fc;
          background-image: url('https://image.admilk.us.kg/image/imgs/20241213144637342.png'); /* 背景图像 */
          background-size: cover;
          background-position: center center;
          background-attachment: fixed;
          background-repeat: no-repeat;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          min-height: 100vh;
          overflow-x: hidden;
          overflow-y: auto;
          box-sizing: border-box;
        }

        /* API 服务列表容器 */
        .api-list {
          position: relative;
          display: flex;
          width: 90%;
          max-width: 1200px;
          padding: 20px;
          background-color: rgba(255, 255, 255, 0.5); /* 更透明的背景 */
          border-radius: 12px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px); /* 适度模糊效果 */
          margin-top: 20px;
          text-align: center;
        }

        /* 卡片容器 */
        .card-container {
          display: flex;
          flex-wrap: wrap; /* 使卡片可以换行 */
          gap: 20px; /* 卡片之间的间隔 */
          justify-content: center; /* 居中排列卡片 */
          margin-top: 20px;
        }

        /* 卡片样式 */
        .card {
          background-color: rgba(255, 255, 255, 0.5); /* 更透明的背景 */
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          width: calc(33.33% - 20px); /* 每行显示3个卡片，减去间隙 */
          margin-bottom: 30px;
          padding: 20px;
          backdrop-filter: blur(10px); /* 模糊效果 */
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .card:hover {
          transform: translateY(-8px); /* 卡片悬浮效果 */
          box-shadow: 0 12px 20px rgba(0, 0, 0, 0.2);
        }

        /* 标题样式 */
        h1 {
          color: #333;
          margin-bottom: 40px;
          font-size: 28px;
          font-weight: bold;
        }

        /* 卡片标题样式 */
        .card h2 {
          margin: 0;
          font-size: 24px;
          color: #333;
        }

        /* 卡片描述文本 */
        .card p {
          font-size: 16px;
          color: #555;
          line-height: 1.6;
          margin: 10px 0;
        }

        /* 认证样式 */
        .card .auth {
          font-size: 14px;
          color: #888;
        }

        /* 请求参数样式 */
        .key {
          margin-top: 20px;
          padding: 10px;
          background-color: #f9f9f9;
          border-radius: 6px;
          border: 1px solid #ddd;
        }

        .key p {
          margin: 5px 0;
          font-size: 14px;
          color: #666;
        }

        .key strong {
          color: #333;
        }

        /* 移动端适配 */
        @media (max-width: 768px) {
          .card {
            width: calc(50% - 20px); /* 平板显示每行2个卡片 */
          }

          h1 {
            font-size: 24px; /* 调整标题大小 */
          }
        }

        /* 更小屏幕适配 */
        @media (max-width: 480px) {
          .card {
            width: 100%; /* 手机屏幕显示每行1个卡片 */
          }

          h1 {
            font-size: 20px;
          }

          .card h2 {
            font-size: 20px;
          }

          .card p {
            font-size: 14px;
          }

          .key p {
            font-size: 12px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
  `
  const cardsHtml = apiList.map(api => {
    const apiName = escapeHtml(api.name)
    const apiPath = escapeHtml(api.path)
    const apiMethod = escapeHtml(api.method)
    const apiDescription = escapeHtml(api.description)
    const auth = api.authentication ? '需要认证' : '不需要认证'

    let keyHtml = ''
    if (api.key && api.key.length > 0) {
      keyHtml = `
        <div class="key"><strong>请求参数:</strong>
        ${api.key.map(param => {
        const paramName = escapeHtml(param.name)
        const paramDescription = escapeHtml(param.description)
        const paramType = escapeHtml(param.type)
        const paramRequired = param.required ? '是' : '否'
        return `
            <p><strong>${paramName}:</strong> ${paramDescription} (类型: ${paramType}, 必填: ${paramRequired})</p>
          `
      }).join('')}
        </div>
      `
    }

    return `
      <div class="card">
        <h2>${apiName}</h2>
        <p><strong>路由:</strong> ${apiPath}</p>
        <p><strong>方法:</strong> ${apiMethod}</p>
        <p><strong>描述:</strong> ${apiDescription}</p>
        <p class="auth"><strong>认证:</strong> ${auth}</p>
        ${keyHtml}
      </div>
    `
  }).join('')

  // 包裹所有卡片的容器，使用 Flexbox 布局
  htmlContent += `
    <div class="card-container">
      ${cardsHtml}
    </div>
  `

  htmlContent += `
    </div>
  </body>
  </html>
  `

  res.end(htmlContent)
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
  const route = `${routePrefix}/${path.basename(filePath, '.js')}`;
  const startTime = Date.now();

  try {
    const handlerModule = await import(pathToFileURL(filePath));
    const handler = handlerModule.default;

    // 判断模块是否为有效的处理函数
    if (typeof handler === 'function') {
      apiHandlersCache[route] = handler;
      const loadTime = Date.now() - startTime;
      loadStats.routeTimes.push({ route, time: loadTime });

      // 加载成功
      logger.debug(chalk.blueBright(`[MEMZ-API] API加载完成 路由: ${route}, 耗时: ${loadTime}ms`));
      loadStats.success++;
    } else {
      // 无效文件
      logger.warn(chalk.yellow(`[MEMZ-API] API服务跳过无效文件: ${filePath}`));
      loadStats.failure++;
    }
  } catch (err) {
    // 捕获错误的堆栈信息
    const stackTrace = err.stack ? err.stack.split('\n') : [];
    stackTrace.forEach(line => {
      if (line.includes('at ')) {
        logger.error(chalk.red(`[MEMZ-API] 错误位置: ${line}`));
      }
    });

    logger.error(`[MEMZ-API] [加载调试] 错误详情:\n${err.stack}`);

    loadStats.failure++;
  }
};

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
  const startTime = Date.now();
  let ip
  if (config.cdn) {
    ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress
  } else {
    ip = req.socket.remoteAddress || req.headers['x-forwarded-for'] || req.headers['x-real-ip']
  }

  // 处理多个 X-Forwarded-For 头部中的多个 IP 地址，取最右边的 IP
  if (ip && ip.includes(',')) {
    ip = ip.split(',').pop().trim();
  }

  // 如果 IP 是 IPv6 映射的 IPv4 地址，去掉 "::ffff:" 前缀
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }

  logger.debug(`[${config.port}][MEMZ-API] [请求调试] 收到请求: IP=${ip}, URL=${req.url}, Method=${req.method}, Headers=${JSON.stringify(req.headers)}`);

  // 黑名单和白名单检查
  if (config.blacklistedIPs.includes(ip)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 禁止访问：您的 IP 已被列入黑名单');
    logger.warn(`[MEMZ-API] [黑名单 IP] ${ip}`);
    return;
  }

  if (config.whitelistedIPs.length > 0 && !config.whitelistedIPs.includes(ip)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 禁止访问：您的 IP 不在白名单中');
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = url.pathname;

  // 记录请求日志
  const logRequest = async (route, ip) => {
    let log = [`[${config.port}][MEMZ-API] [请求日志] IP: ${ip} 路由: ${route}`];
    const queryParams = new URLSearchParams(url.search);
    if ([...queryParams].length > 0) {
      const paramString = [...queryParams].map(([key, value]) => `${key}:${value}`).join(',');
      log.push(`参数: ${paramString}`);
    }
    logger.info(log.join(' '));
    await updateRequestStats(ip, route);
  };

  // 路由处理
  if (route === '/') {
    logRequest(route, ip);
    return web(req, res);
  }

  if (route === '/health') {
    logRequest(route, ip);
    return healthCheck(req, res);
  }

  if (route === '/stats') {
    logRequest(route, ip);
    return await getStats(req, res);
  }

  if (route === '/favicon.ico') {
    logRequest(route, ip);
    return await serveFavicon(req, res);
  }

  const handler = apiHandlersCache[route];
  if (handler) {
    try {
      logRequest(route, ip);

      if (config.corsenabled) {
        res.setHeader('Access-Control-Allow-Origin', config.corsorigin);
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');

      await handler(req, res);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`500 服务器内部错误：${err.message}`);
      logger.error(`[${config.port}][MEMZ-API] 路由: ${route} 错误: ${err.message}`);
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 未找到：接口不存在');
    logger.warn(`[${config.port}][MEMZ-API] [404] 路由不存在: ${route}`);
  }

  const endTime = Date.now();
  logger.info(`[${config.port}][MEMZ-API] [请求完成] IP: ${ip} 路由: ${route} 响应时间: ${endTime - startTime}ms`);
};

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