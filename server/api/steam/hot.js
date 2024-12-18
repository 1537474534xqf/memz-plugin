import { MEMZ_NAME } from '#components'
export default async (req, res) => {
  const url = 'https://steamcharts.com/top'
  const timestamp = new Date().toISOString()
  const title = 'Steam Charts'

  if (req.method === 'GET') {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
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

      const result = {
        code: 0,
        message: '解析成功',
        title,
        time: timestamp,
        data: rankings,
        source: MEMZ_NAME
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(result))
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({
        code: 500,
        message: '解析失敗',
        title,
        time: timestamp,
        error: error.message,
        source: MEMZ_NAME
      }))
    }
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('405 方法不允许')
  }
}
