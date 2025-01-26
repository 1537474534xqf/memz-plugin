import { BaseApiHandler } from '../../lib/baseHandler.js'
import { performCiliSearch } from '../../../model/Search.js'
import logger from '../../lib/logger.js'

export const title = '磁力搜索'
export const key = { key: '需要搜索的关键词' }
export const description = '搜索磁力资源'

export default async (req, res) => {
  const handler = new BaseApiHandler(req, res, { title })

  try {
    if (!handler.validateMethod('GET')) return

    const missing = handler.validateParams({ key: true })
    if (missing.length) {
      return handler.sendParamError(`缺少参数: ${missing.join(', ')}`)
    }

    const keyword = handler.url.searchParams.get('key')
    logger.debug(`[磁力搜索] 开始搜索: ${keyword}`)

    const results = await performCiliSearch(keyword)
    if (!results) {
      return handler.handleError(new Error('搜索失败'), '无法获取磁力搜索结果')
    }

    handler.sendSuccess(results)
    logger.debug(`[磁力搜索] 搜索成功: ${keyword}`)
  } catch (error) {
    handler.handleError(error)
  }
}
