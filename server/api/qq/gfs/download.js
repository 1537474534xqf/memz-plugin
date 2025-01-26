import { BaseApiHandler } from '../../../lib/baseHandler.js'
import logger from '../../../lib/logger.js'
import { download } from '../../../../model/Gfs.js'

export const title = '群文件下载'
export const key = { group: '需要查询的群号', fid: '需要查询的文件ID' }
export const description = '下载群文件'

export default async (req, res) => {
  const handler = new BaseApiHandler(req, res, { title })

  try {
    if (!handler.validateMethod('GET')) return

    const missing = handler.validateParams({ group: true, fid: true })
    if (missing.length) {
      return handler.sendParamError(`缺少参数: ${missing.join(', ')}`)
    }

    const group = handler.url.searchParams.get('group')
    const fid = handler.url.searchParams.get('fid')
    logger.debug(`[群文件下载] 查询群号: ${group}, 文件ID: ${fid}`)
    const fileBuffer = await download(group, fid)

    handler.sendSuccess(fileBuffer)
    logger.debug(`[群文件下载] 成功: 群号 ${group}, 文件ID ${fid}`)
  } catch (error) {
    handler.handleError(error)
  }
}
