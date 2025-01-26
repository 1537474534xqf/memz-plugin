import { BaseApiHandler } from '../../../lib/baseHandler.js'
import logger from '../../../lib/logger.js'
import { df } from '../../../../model/Gfs.js'

export const title = '群文件信息'
export const key = { group: '需要查询的群号' }
export const description = '获取群文件信息'

export default async (req, res) => {
  const handler = new BaseApiHandler(req, res, { title })

  try {
    if (!handler.validateMethod('GET')) return

    const missing = handler.validateParams({ group: true })
    if (missing.length) {
      return handler.sendParamError(`缺少参数: ${missing.join(', ')}`)
    }

    const group = handler.url.searchParams.get('group')
    logger.debug(`[群文件信息] 查询群号: ${group}`)

    const fileInfo = await df(group)

    handler.sendSuccess(fileInfo)
    logger.debug(`[群文件信息] 查询成功: ${JSON.stringify(fileInfo)}`)
  } catch (error) {
    handler.handleError(error)
  }
}
