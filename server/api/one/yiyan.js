import logger from '../../lib/logger.js'
import path from 'path'
import { BaseApiHandler } from '../../lib/baseHandler.js'
import { PluginData } from '#components'
import { getRandomYiyan } from '../../../model/one.js'

const yiyanFilePath = path.join(PluginData, 'one', 'yiyan.txt')
export const title = '一言API'
export const key = { type: 'text/json 返回格式' }
export const description = '随机返回一条句子'

export default async (req, res) => {
  const handler = new BaseApiHandler(req, res, { title })

  try {
    if (!handler.validateMethod('GET')) return
    const type = handler.url.searchParams.get('type')
    logger.debug('[一言] 开始获取')
    const yiyan = await getRandomYiyan(type, yiyanFilePath)

    if (!yiyan) {
      return handler.handleError(new Error('获取失败'), '无法获取一言数据')
    }

    if (type === 'text') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
      return res.end(yiyan)
    }

    handler.sendSuccess(yiyan)
    logger.debug('[一言] 获取成功')
  } catch (error) {
    handler.handleError(error)
  }
}
