import { BaseApiHandler } from '../lib/baseHandler.js'
import { generateApiDocs } from '../model/apiDocs.js'
import { Version } from '#components'
import logger from '../lib/logger.js'

export const title = 'API文档'
export const method = 'GET'
export const description = '获取所有API接口的文档信息'

export default async (req, res) => {
  const handler = new BaseApiHandler(req, res, { title })

  try {
    if (!handler.validateMethod('GET')) return

    logger.debug('[API文档] 开始生成')
    const apiDocs = await generateApiDocs()

    const apiDocumentation = {
      name: 'MEMZ-API',
      version: Version.latestVersion,
      description: '这是一个基于 MEMZ-API 搭建的服务',
      data: apiDocs
    }

    handler.sendSuccess(apiDocumentation)
    logger.debug('[API文档] 生成成功')
  } catch (error) {
    handler.handleError(error)
  }
}
