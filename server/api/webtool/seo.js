import { BaseApiHandler } from '../../lib/baseHandler.js'
import { fetchSeoFromHtml } from '../../../model/webtool.js'
import logger from '../../lib/logger.js'

export const title = 'SEO查询'
export const key = { url: '需要查询的URL' }

export default async (req, res) => {
  const handler = new BaseApiHandler(req, res, { title })

  try {
    if (!handler.validateMethod('GET')) return

    const missing = handler.validateParams({ url: true })
    if (missing.length) {
      return handler.sendParamError(`缺少参数: ${missing.join(', ')}`)
    }

    const url = handler.url.searchParams.get('url')
    logger.debug(`[SEO] 开始查询: ${url}`)

    const seoInfo = await fetchSeoFromHtml(url)
    if (!seoInfo) {
      return handler.handleError(new Error('查询失败'), '无法获取SEO信息')
    }

    handler.sendSuccess(seoInfo)
    logger.debug(`[SEO] 查询成功: ${url}`)
  } catch (error) {
    handler.handleError(error)
  }
}
