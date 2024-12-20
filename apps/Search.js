import path from 'node:path'
import { Config, PluginData } from '#components'
import { loadDataFromExcelFiles, searchResources, performCiliSearch } from '#model'
const folderPath = path.join(PluginData, 'xlsx')

/**
 * 统计分类数量
 * @param {Array} data 数据
 * @returns {Object} 分类统计结果
 */
function countCategories (data) {
  return data.reduce((acc, row) => {
    const category = row.分类 || '未分类'
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {})
}
// 缓存
let cachedData = null

export class Search extends plugin {
  constructor () {
    super({
      name: '资源搜索',
      dsc: '根据关键词搜索名称',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: '^#?搜资源\\s*(\\S+)$',
          fnc: 'handleSearch'
        },
        {
          reg: '^#?资源(分类|类别)?(统计|数量|总数|总计)$',
          fnc: 'handleCategoryCount'
        },
        {
          reg: '^#?磁力搜索\\s*(.+)',
          fnc: 'CiliSearch'
        },
        {
          reg: '^#?搜影视\\s*(\\S+)$',
          fnc: 'TheFilmAndTelevision'
        }
      ]
    })
    this.loadData()
  }

  // 缓存一下,避免每次都加载数据
  async loadData () {
    if (cachedData) {
      logger.debug('[memz-plugin] [搜资源] 缓存命中')
      return cachedData
    }

    try {
      logger.debug('[memz-plugin] [搜资源] 加载数据')
      cachedData = await loadDataFromExcelFiles(folderPath)
      return cachedData
    } catch (error) {
      throw new Error('加载数据失败: ' + error.message)
    }
  }

  async handleSearch (e) {
    const { SearchResource } = Config.getConfig('memz')
    if (!SearchResource) {
      return logger.warn('[memz-plugin] 搜资源状态当前为关闭')
    }

    const keyword = e.msg.match(/^#?搜资源\s*(\S+)$/)?.[1]
    if (!keyword) {
      return e.reply('请输入关键词进行搜索！', true)
    }

    try {
      const resultsJson = await searchResources(keyword, cachedData)

      if (resultsJson.length > 0) {
        const forward = resultsJson.map(row => {
          return {
            user_id: e.user_id,
            nickname: e.sender.nickname || '为什么不玩原神',
            message: `名称: ${row.关键词}\n内容: ${row.内容}\n分类: ${row.分类}`
          }
        })

        forward.push({
          user_id: 382879217,
          nickname: 'ZSY11',
          message: '来源：十一实验室(QQ群632226555)\n官网：https://zsy11.com'
        })

        await e.reply(await Bot.makeForwardMsg(forward))
      } else {
        e.reply('没有找到你想要的哦~', true)
      }
    } catch (error) {
      e.reply(`搜索过程中发生错误：${error.message}`, true)
      logger.error('搜索过程中发生错误:', error)
    }
  }

  async handleCategoryCount (e) {
    try {
      const categoryCount = countCategories(cachedData)
      const message = Object.entries(categoryCount)
        .map(([category, count]) => `${category}: ${count} 个资源`)
        .join('\n')
      e.reply(`----资源分类统计----\n${message}`)
    } catch (error) {
      e.reply(`统计过程中发生错误：${error.message}`, true)
    }
  }

  async CiliSearch (e) {
    const { SearchMagnet } = Config.getConfig('memz')
    if (!SearchMagnet && !e.isMaster) return logger.warn('[memz-plugin]磁力搜索状态当前为仅主人可用')

    const msg = e.msg
    const searchQuery = msg.match(/^#?磁力搜索\s*(.+)$/)?.[1]

    if (!searchQuery) {
      return await e.reply('请输入有效的搜索关键词！', true)
    }

    try {
      const results = await performCiliSearch(searchQuery)

      if (results.length > 0) {
        const forward = results.map(row => ({
          user_id: 2173302144,
          nickname: '为什么不玩原神',
          message: [
            `名称: ${row.title}\n文件大小: ${row.size}\n下载链接: ${row.link}`
          ]
        }))
        const nmsg = await Bot.makeForwardMsg(forward)
        await e.reply(nmsg)
      } else {
        await e.reply('未找到匹配的资源。', true)
      }
    } catch (error) {
      logger.error('获取数据时出错:', error)
      await e.reply('搜索过程中发生错误，请稍后再试。', true)
    }
  }

  async TheFilmAndTelevision (e) {
    const { SearchMovie } = Config.getConfig('memz')
    if (!SearchMovie) return logger.warn('[memz-plugin] 搜影视功能已禁用')

    const keyword = e.msg.match(/^#?搜影视\s*(\S+)$/)?.[1]
    if (!keyword) return e.reply('请输入关键词进行搜索！', true)

    try {
      const apiUrl = `https://ysxjjkl.souyisou.top/api_searchtxt.php?name=${encodeURIComponent(keyword)}`
      const response = await fetch(apiUrl)
      const text = await response.text()

      if (text.includes('[可怜]对不起，本资源暂未收录')) return e.reply('未找到匹配的结果。', true)

      const results = text.split('\n名称：').slice(1).map(item => {
        const name = item.match(/^(.*?)\s*链接：/)?.[1]?.trim()
        const link = item.match(/链接：(https:\/\/\S+)/)?.[1]
        return { name, category: '影视资源', link }
      }).filter(Boolean)

      if (results.length > 0) {
        const forward = results.map(row => ({
          user_id: e.user_id,
          nickname: 'ZSY11',
          message: `名称: ${row.name}\n链接: ${row.link}\n分类: ${row.category}`
        }))
        await e.reply(await Bot.makeForwardMsg(forward))
      } else {
        e.reply('未找到匹配的结果。', true)
      }
    } catch (error) {
      e.reply(`搜索过程中发生错误：${error.message}`, true)
    }
  }
}
