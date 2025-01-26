import { BaseApiHandler } from '../../lib/baseHandler.js'
import { searchResources, loadDataFromExcelFiles } from '../../../model/Search.js'
import logger from '../../lib/logger.js'
import { PluginData } from '#components'
import path from 'path'

const folderPath = path.join(PluginData, 'xlsx')
export const title = '游戏搜索'
export const key = { key: '需要搜索的关键词' }
export const description = '搜索游戏资源'

// 缓存
let cachedData = null
async function loadData () {
  if (cachedData) {
    logger.info('[memz-plugin] [API] [游戏搜索] 缓存命中')
    return cachedData
  }

  try {
    cachedData = loadDataFromExcelFiles(folderPath)
    logger.info('[memz-plugin] [API] [游戏搜索] 缓存未命中, 加载数据成功')
    return cachedData
  } catch (error) {
    throw new Error('加载数据失败: ' + error.message)
  }
}
export default async (req, res) => {
  const handler = new BaseApiHandler(req, res, { title })

  try {
    const data = await loadData()

    if (!handler.validateMethod('GET')) return

    const missing = handler.validateParams({ key: true })
    if (missing.length) {
      return handler.sendParamError(`缺少参数: ${missing.join(', ')}`)
    }

    const keyword = handler.url.searchParams.get('key')
    logger.debug(`[游戏搜索] 开始搜索: ${keyword}`)

    const results = await searchResources(keyword, data)
    if (!results) {
      return handler.handleError(new Error('搜索失败'), '无法获取游戏搜索结果')
    }

    handler.sendSuccess(results)
    logger.debug(`[游戏搜索] 搜索成功: ${keyword}`)
  } catch (error) {
    handler.handleError(error)
  }
}
