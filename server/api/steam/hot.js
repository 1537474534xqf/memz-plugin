import logger from '../../lib/logger.js'
import { BaseApiHandler } from '../../lib/baseHandler.js'

export const title = 'Steam 热门游戏榜单'
export const key = { type: 'text/json 返回格式' }
export const description = '获取 Steam 热门游戏排行'

export default async (req, res) => {
  const handler = new BaseApiHandler(req, res, { title })

  try {
    if (!handler.validateMethod('GET')) return

    const url = 'https://steamcharts.com/top'

    const response = await fetch(url)
    if (!response.ok) {
      return handler.handleError(new Error(`HTTP error! status: ${response.status}`), '无法获取 SteamCharts 数据')
    }
    const html = await response.text()

    const rankings = []
    const rowRegex = /<tr.*?>.*?<\/tr>/gs
    const rows = html.match(rowRegex)

    if (rows) {
      rows.forEach((row) => {
        const nameMatch = row.match(/<a href="\/app\/\d+">([^<]+)<\/a>/)
        const currentPlayersMatch = row.match(/<td class="num">(\d[\d,]*)<\/td>/)
        const peakPlayersMatch = row.match(/<td class="num period-col peak-concurrent">(\d[\d,]*)<\/td>/)
        const hoursPlayedMatch = row.match(/<td class="num period-col player-hours">(\d[\d,]*)<\/td>/)

        if (nameMatch && currentPlayersMatch && peakPlayersMatch && hoursPlayedMatch) {
          rankings.push({
            show_name: nameMatch[1].trim(),
            current_players: parseInt(currentPlayersMatch[1].replace(/,/g, ''), 10),
            peak_players: parseInt(peakPlayersMatch[1].replace(/,/g, ''), 10),
            hours_played: parseInt(hoursPlayedMatch[1].replace(/,/g, ''), 10)
          })
        }
      })
    }

    handler.sendSuccess(rankings)
    logger.debug('[Steam Charts] 获取成功')
  } catch (error) {
    handler.handleError(error)
  }
}
