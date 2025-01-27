import logger from '../../lib/logger.js'
import path from 'path'
import fs from 'fs'
import { BaseApiHandler } from '../../lib/baseHandler.js'
import { PluginData } from '#components'

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

/**
 * 获取随机一言
 * @param {string} type - 响应的类型，可以是 'text' 或 'json'
 * @param {string} filePath - 一言文件的路径
 * @returns {string | object} 返回随机的一言
 */
export function getRandomYiyan (type, filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('一言文件不存在')
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const yiyanLines = fileContent.split('\n').filter(line => line.trim() !== '')

    if (yiyanLines.length === 0) {
      return null
    }

    const randomIndex = Math.floor(Math.random() * yiyanLines.length)
    const randomYiyan = yiyanLines[randomIndex].trim()

    if (type === 'text') {
      return randomYiyan
    } else {
      return {
        data: randomYiyan
      }
    }
  } catch (error) {
    return null
  }
}
