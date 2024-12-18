import whois from 'whois-json'
import { URL } from 'url'
import { translateWhoisData } from '#model'
import { MEMZ_NAME } from '#components'
const time = new Date().toISOString()

export default async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http')
    const parsedUrl = new URL(req.url, `${protocol}://${req.headers.host}`)

    const domain = parsedUrl.searchParams.get('domain')

    if (!domain) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({
        code: 400,
        message: '缺少必要的域名参数, 请在查询参数中添加domain参数',
        title: 'Whois查询',
        time,
        source: MEMZ_NAME
      }))
      return
    }

    const whoisData = await whois(domain)
    logger.debug(`[memz-plugin] WHOIS 数据: ${JSON.stringify(whoisData)}`)
    const chineseData = await translateWhoisData(whoisData)
    logger.debug(`[memz-plugin] 中文数据: ${JSON.stringify(chineseData)}`)

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 0,
      message: '查询成功',
      title: 'Whois查询',
      time,
      data: chineseData,
      source: MEMZ_NAME
    }))
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 500,
      message: '查询失败',
      title: 'Whois查询',
      time,
      error: error.message,
      source: MEMZ_NAME
    }))
  }
}
