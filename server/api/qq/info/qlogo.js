import { copyright } from '#components'
import logger from '../../../lib/logger.js'

export const title = 'QQ头像查询'
export const key = { qq: 'QQ号码' }

export default async (req, res) => {
  const time = new Date().toLocaleString()
  try {
    const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http')
    const parsedUrl = new URL(req.url, `${protocol}://${req.headers.host}`)

    const qqNumber = parsedUrl.searchParams.get('qq')

    if (!qqNumber) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 400,
        message: '缺少 qq 参数,请提供要查询的 QQ 号码, qq=?',
        copyright
      }))
    }

    const avatarUrl = `https://q.qlogo.cn/headimg_dl?dst_uin=${qqNumber}&spec=640&img_type=jpg`
    logger.debug(`请求的头像URL: ${avatarUrl}`)

    const response = await fetch(avatarUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
        Referer: 'https://q.qlogo.cn'
      }
    })

    if (!response.ok) {
      logger.error(`获取头像失败: ${response.status} ${response.statusText}`)
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 500,
        message: '无法获取QQ头像',
        time,
        copyright
      }))
    }

    logger.debug(`头像获取成功, 状态码: ${response.status}`)

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const contentLength = buffer.length

    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Length': contentLength, // 设置 Content-Length
      'Cache-Control': 'no-cache', // 不缓存图片
      'Accept-Ranges': 'bytes', // 支持部分加载（适用于大图片）
      'Access-Control-Allow-Origin': '*', // 允许跨域访问
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept', // 添加CORS允许的头部
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' // 允许的方法
    })

    res.end(buffer)

    logger.debug(`[MEMZ-API] ${title}：QQ号 ${qqNumber}, 头像URL: ${avatarUrl}`)
  } catch (error) {
    if (!res.headersSent) {
      logger.error(`请求失败: ${error.message}`)
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 500,
        message: '请求失败',
        time,
        error: error.message,
        copyright
      }))
    }
  }
}
