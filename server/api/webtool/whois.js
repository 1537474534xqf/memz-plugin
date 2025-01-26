import { BaseApiHandler } from '../../lib/baseHandler.js'
import { translateWhoisData } from '../../../model/webtool.js'
import logger from '../../lib/logger.js'

export const title = 'Whois查询'
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
    logger.debug(`[Whois] 开始查询: ${domain}`)

    const whoisInfo = await translateWhoisData(domain)
    if (!whoisInfo) {
      return handler.handleError(new Error('查询失败'), '无法获取Whois信息')
    }

    handler.sendSuccess(whoisInfo)
    logger.debug(`[Whois] 查询成功: ${domain}`)
  } catch (error) {
    handler.handleError(error)
  }
}
