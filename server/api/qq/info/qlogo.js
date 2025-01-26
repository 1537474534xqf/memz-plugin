import { BaseApiHandler } from '../../../lib/baseHandler.js'
import logger from '../../../lib/logger.js'

export const title = 'QQ头像查询'
export const key = { qq: 'QQ号码' }

export default async (req, res) => {
  const handler = new BaseApiHandler(req, res, { title })

  try {
    if (!handler.validateMethod('GET')) return

    const missing = handler.validateParams({ qq: true })
    if (missing.length) {
      return handler.sendParamError(`缺少参数: ${missing.join(', ')}`)
    }

    const qqNumber = handler.url.searchParams.get('qq')
    const avatarUrl = `https://q.qlogo.cn/headimg_dl?dst_uin=${qqNumber}&spec=640&img_type=jpg`
    logger.debug(`[QQ头像] 开始获取: ${avatarUrl}`)

    const response = await fetch(avatarUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
        Referer: 'https://q.qlogo.cn'
      }
    })

    if (!response.ok) {
      return handler.handleError(
        new Error(`HTTP ${response.status}`),
        '获取QQ头像失败'
      )
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'no-cache',
      'Accept-Ranges': 'bytes'
    })
    res.end(buffer)

    logger.debug(`[QQ头像] 获取成功: ${qqNumber}`)
  } catch (error) {
    if (!res.headersSent) {
      handler.handleError(error)
    }
  }
}
