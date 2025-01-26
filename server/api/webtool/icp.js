import { BaseApiHandler } from '../../lib/baseHandler.js'
import { fetchIcpInfo } from '../../../model/webtool.js'
import logger from '../../lib/logger.js'

export const title = 'ICP备案查询'
export const key = { domain: '需要查询的域名' }

export default async (req, res) => {
  const handler = new BaseApiHandler(req, res, { title })

  try {
    if (!handler.validateMethod('GET')) return

    const missing = handler.validateParams({ domain: true })
    if (missing.length) {
      return handler.sendParamError(`缺少参数: ${missing.join(', ')}`)
    }

    const domain = handler.url.searchParams.get('domain')
    logger.debug(`[ICP] 开始查询: ${domain}`)

    const icpInfo = await fetchIcpInfo(domain)
    if (!icpInfo) {
      return handler.handleError(new Error('查询失败'), '无法获取ICP信息')
    }

    handler.sendSuccess(icpInfo)
    logger.debug(`[ICP] 查询成功: ${domain}`)
  } catch (error) {
    handler.handleError(error)
  }
}
