import { PluginData, copyright } from '#components'
import { getRandomYiyan } from '#model'
import path from 'path'

const yiyanFilePath = path.join(PluginData, 'api', 'one', 'yiyan.txt')

export default async (req, res) => {
  try {
    // 获取协议头和请求 URL
    const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http')
    const parsedUrl = new URL(req.url, `${protocol}://${req.headers.host}`)
    let type = parsedUrl.searchParams.get('type')

    // 如果 type 不是 'text' 或 'json'，返回错误
    if (type && type !== 'text' && type !== 'json') {
      if (res.headersSent) return // 检查是否已发送响应
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({
        code: 400,
        message: '无效的 type 参数，仅支持 "text" 或 "json"',
        copyright
      }))
      return
    }

    // 默认 type 为 'json'
    if (!type) {
      type = 'json'
    }

    const time = new Date().toISOString()
    const title = '一言API'

    // 调用 getRandomYiyan 函数获取随机一言
    const randomYiyan = getRandomYiyan(type, yiyanFilePath)
    logger.debug(`随机一言：${randomYiyan}`)

    // 如果 getRandomYiyan 返回的是 undefined 或空数据，抛出错误
    if (!randomYiyan) {
      if (res.headersSent) return // 检查是否已发送响应
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({
        code: 500,
        message: '一言文件读取失败或文件为空',
        copyright
      }))
      return
    }

    // 如果 type 为 'text'，返回纯文本
    if (type === 'text') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(randomYiyan) // 直接返回随机一言
    } else {
      // 返回 JSON 格式的响应
      const result = {
        code: 0,
        message: '获取成功',
        title,
        time,
        data: randomYiyan,
        type,
        copyright
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(result)) // 返回 JSON 格式
    }
  } catch (error) {
    // 如果发生异常，返回错误信息
    if (res.headersSent) return // 检查是否已发送响应
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 500,
      message: '请求失败',
      error: error.message,
      copyright
    }))
  }
}
