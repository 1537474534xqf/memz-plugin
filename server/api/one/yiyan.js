import { PluginData, copyright } from '#components'
import { getRandomYiyan } from '#model'
import path from 'path'

const yiyanFilePath = path.join(PluginData, 'one', 'yiyan.txt')

export default async (req, res) => {
  try {
    const time = new Date().toISOString()
    const title = '一言API'
    const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http')
    const parsedUrl = new URL(req.url, `${protocol}://${req.headers.host}`)
    let type = parsedUrl.searchParams.get('type')

    if (type && type !== 'text' && type !== 'json') {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({
        code: 400,
        message: '无效的 type 参数，仅支持 "text" 或 "json"',
        copyright
      }))
      return
    }

    if (!type) {
      type = 'json'
    }

    const randomYiyan = await getRandomYiyan(type, yiyanFilePath)
    logger.debug(`[MEMZ-API] 随机一言：${JSON.stringify(randomYiyan)}`)

    if (!randomYiyan) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({
        code: 500,
        message: '一言文件读取失败或文件为空',
        copyright
      }))
      return
    }

    if (type === 'text') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(randomYiyan)
    } else {
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
      res.end(JSON.stringify(result))
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 500,
      message: '请求失败',
      error: error.message,
      copyright
    }))
  }
}
