import { MEMZ_NAME } from '../../components/index.js'
export default async (req, res) => {
  if (req.method === 'GET') {
    const time = new Date().toISOString()
    const title = 'BiliBili热榜'
    try {
      const response = await fetch('https://api.bilibili.com/x/web-interface/wbi/search/square?limit=10')
      const rawData = await response.json()

      if (rawData.code === 0 && rawData.data?.trending?.list) {
        const parsedData = rawData.data.trending.list.map(item => ({
          show_name: item.show_name || '',
          heat_score: item.heat_score || 0
        }))

        const result = {
          code: 0,
          message: '解析成功',
          title,
          time,
          data: parsedData,
          source: MEMZ_NAME
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(result))
      } else {
        throw new Error('接口返回数据格式異常')
      }
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({
        code: 500,
        message: '解析失败',
        title,
        time,
        error: error.message,
        source: MEMZ_NAME
      }))
    }
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('405 方法不允许')
  }
}
