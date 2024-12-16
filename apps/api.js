import { Config } from '../components/index.js'
const { enabled, port } = Config.getConfig('api')

const BilBil热榜接口 = `http://127.0.0.1:${port}/bilibili/hot`
const Steam热榜接口 = `http://127.0.0.1:${port}/steam/hot`
const 调用统计接口 = `http://127.0.0.1:${port}/stats`
export class MEMZ_API extends plugin {
  constructor () {
    super({
      name: 'MEMZ_API',
      dsc: 'MEMZ_API',
      event: 'message',
      priority: 9,
      rule: [
        {
          reg: /^#?(B站|Bilibili|哔哩哔哩)(熱榜|热榜|热门)(榜单)?$/i,
          fnc: '获取BilBil热榜'
        },
        {
          reg: /^#?(Steam|SteamCharts)(热门榜单|熱榜|热榜|熱門榜單)$/i,
          fnc: '获取Steam热榜'
        },
        {
          reg: /^#?(MEMZ)?API(调用|请求|访问)统计$/i,
          fnc: '获取API统计'
        }
      ]
    })
  }

  async 获取BilBil热榜 (e) {
    if (!enabled) { return logger.warn('[memz-plugin]API服務端未启用！') }
    try {
      const 响应 = await fetch(BilBil热榜接口)
      if (!响应.ok) { throw new Error(`HTTP error! status: ${响应.status}`) }
      const 数据 = await 响应.json()
      if (数据.code !== 0) { throw new Error(`API 返回错误: ${数据.message}`) }
      let 回复消息 = `BiliBili 热榜\n更新时间：${new Date(数据.time).toLocaleString()}\n`
      数据.data.forEach((item, index) => {
        回复消息 += `${index + 1}. ${item.show_name}（热度：${item.heat_score}）\n`
      })

      e.reply(回复消息.trim(), true)
    } catch (错误) {
      e.reply(`抱歉，获取 Bilibili 热榜失败，请稍后再试！\n错误信息：${错误.message}`, true)
      logger.error('获取Bilibili热榜失败', 错误)
    }
  }

  async 获取Steam热榜 (e) {
    if (!enabled) { return logger.warn('[memz-plugin]API 服务端未启用！') }
    try {
      const 响应 = await fetch(Steam热榜接口)
      if (!响应.ok) {
        throw new Error(`HTTP 错误！状态码：${响应.status}`)
      }

      const 数据 = await 响应.json()
      if (数据.code !== 0) {
        throw new Error(`API 返回错误: ${数据.message}`)
      }

      let 回复消息 = `Steam 热榜\n更新时间：${new Date(数据.time).toLocaleString()}\n`
      数据.data.slice(0, 10).forEach((游戏, 索引) => {
        回复消息 += `${索引 + 1}. ${游戏.show_name}\n`
        回复消息 += `   当前玩家：${游戏.current_players}\n`
        回复消息 += `   峰值玩家：${游戏.peak_players}\n`
        回复消息 += `   总时长：${游戏.hours_played}\n\n`
      })

      e.reply(回复消息.trim(), true)
    } catch (错误) {
      e.reply(`抱歉，获取 Steam 热榜失败，请稍后再试！\n错误信息：${错误.message}`, true)
      logger.error('获取 Steam 热榜失败', 错误)
    }
  }

  async 获取API统计 (e) {
    if (!enabled) {
      logger.warn('[memz-plugin]API 服务端未启用！')
      e.reply('MEMZ-API 服务端未启用！', true)
      return
    }
    try {
      const 响应 = await fetch(调用统计接口)
      if (!响应.ok) {
        throw new Error(`HTTP error! status: ${响应.status}`)
      }

      const 数据 = await 响应.json()
      let 回复消息 = `API 调用统计信息\n更新时间：${new Date().toLocaleString()}\n\n`

      for (const [ip, stats] of Object.entries(数据)) {
        回复消息 += `IP: ${ip}\n`
        if (stats.total) {
          回复消息 += `  总计: ${stats.total} 次\n`
        }
        for (const [endpoint, count] of Object.entries(stats)) {
          if (endpoint !== 'total') {
            回复消息 += `  接口 ${endpoint}: ${count} 次\n`
          }
        }
        回复消息 += '\n'
      }

      e.reply(回复消息.trim(), true)
    } catch (错误) {
      e.reply(`抱歉，获取 API 统计信息失败，请稍后再试！\n错误信息：${错误.message}`, true)
      logger.error('获取API统计失败', 错误)
    }
  }
}
