import { BaseApiHandler } from '../../../lib/baseHandler.js'
import { fetchQQRegistrationDate } from '../../../model/QQ/QQAge.js'
import logger from '../../../lib/logger.js'

export const title = 'QQ注册时间查询'
export const key = { qq: 'QQ号码' }

export default async (req, res) => {
  const handler = new BaseApiHandler(req, res, { title })

  try {
    // 验证请求方法
    if (!handler.validateMethod('GET')) return

    // 验证参数
    const missing = handler.validateParams({ qq: true })
    if (missing.length) {
      return handler.sendParamError(`缺少参数: ${missing.join(', ')}`)
    }

    const qqNumber = handler.url.searchParams.get('qq')
    logger.debug(`[QQ注册时间] 开始查询: ${qqNumber}`)

    // 获取数据
    const registrationInfo = await fetchQQRegistrationDate(qqNumber)
    if (!registrationInfo) {
      return handler.handleError(new Error('无法获取数据'), '无法获取QQ注册时间')
    }

    logger.debug(`[QQ注册时间] 查询成功: ${JSON.stringify(registrationInfo)}`)
    handler.sendSuccess(registrationInfo)
  } catch (error) {
    handler.handleError(error)
  }
}
