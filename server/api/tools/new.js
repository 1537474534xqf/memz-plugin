import { BaseApiHandler } from '../../lib/baseHandler.js'
import logger from '../../lib/logger.js'

export const title = '跳转'
export const key = { url: '需要跳转的URL' }
export const description = 'URL重定向'

export default async (req, res) => {
  const handler = new BaseApiHandler(req, res, { title })

  try {
    if (!handler.validateMethod('GET')) return

    const missing = handler.validateParams({ url: true })
    if (missing.length) {
      return handler.sendParamError(`缺少参数: ${missing.join(', ')}`)
    }

    const url = handler.url.searchParams.get('url')
    logger.debug(`[跳转] 目标URL: ${url}`)

    // 验证URL格式
    try {
      const parsedUrl = new URL(url)
      res.writeHead(302, { Location: parsedUrl.href })
      res.end()
      logger.debug(`[跳转] 成功: ${parsedUrl.href}`)
    } catch (e) {
      return handler.sendParamError('无效的URL格式')
    }
  } catch (error) {
    handler.handleError(error)
  }
}
