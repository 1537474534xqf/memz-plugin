import { BaseApiHandler } from '../../../lib/baseHandler.js'
import logger from '../../../lib/logger.js'
import { dir } from '../../../../model/Gfs.js'

export const title = '群文件目录'
export const key = { group: '需要查询的群号', pid: '需要查询的文件ID' }
export const description = '获取群文件目录'

export default async (req, res) => {
  const handler = new BaseApiHandler(req, res, { title })

  try {
    if (!handler.validateMethod('GET')) return

    const missing = handler.validateParams({ group: true, pid: false })
    if (missing.length) {
      return handler.sendParamError(`缺少参数: ${missing.join(', ')}`)
    }

    const group = handler.url.searchParams.get('group')
    const pid = handler.url.searchParams.get('pid')
    logger.debug(`[群文件目录] 查询群号: ${group}, 文件ID: ${pid}`)

    const dirInfo = await dir(group, pid)

    handler.sendSuccess(dirInfo)
    logger.debug(`[群文件目录] 查询成功: ${JSON.stringify(dirInfo)}`)
  } catch (error) {
    handler.handleError(error)
  }
}
