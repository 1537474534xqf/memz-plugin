import { BaseApiHandler } from '../../../lib/baseHandler.js'
import { executeShareCard } from '../../../model/QQ/b77.js'
import logger from '../../../lib/logger.js'

export const title = 'QQ音乐分享卡片'
export const key = {
  type: '类型',
  title: '标题',
  content: '内容',
  singer: '歌手',
  image: '图片'
}
export const method = 'POST'

export default async (req, res) => {
  const handler = new BaseApiHandler(req, res, { title })

  try {
    if (!handler.validateMethod('POST')) return

    const body = await new Promise((resolve, reject) => {
      let data = ''
      req.on('data', chunk => { data += chunk })
      req.on('end', () => resolve(data))
      req.on('error', reject)
    })

    const params = JSON.parse(body)
    const required = ['type', 'title', 'content', 'singer', 'image']
    const missing = required.filter(key => !params[key])

    if (missing.length) {
      return handler.sendParamError(`缺少参数: ${missing.join(', ')}`)
    }

    logger.debug(`[音乐卡片] 开始生成: ${params.title}`)
    const shareCardResult = await executeShareCard(
      params.type,
      params.title,
      params.content,
      params.singer,
      params.image
    )

    if (!shareCardResult) {
      return handler.handleError(new Error('生成失败'), '无法生成音乐卡片')
    }

    handler.sendSuccess(JSON.parse(shareCardResult))
    logger.debug(`[音乐卡片] 生成成功: ${params.title}`)
  } catch (error) {
    handler.handleError(error)
  }
}
