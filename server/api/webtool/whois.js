import whois from 'whois-json'
import { URL } from 'url'
import { translateWhoisData } from '../../../model/webtool.js'
import { copyright } from '#components'
const time = new Date().toISOString()

export default async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http')
    const parsedUrl = new URL(req.url, `${protocol}://${req.headers.host}`)

    let domain = parsedUrl.searchParams.get('domain')
    domain = domain.replace(/^https?:\/\//, '').split('/')[0].split('?')[0].split('#')[0]
    domain = domain.replace(/^www\./, '')

    if (!domain) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({
        code: 400,
        message: '缺少必要的域名参数, 请在查询参数中添加domain参数',
        title: 'Whois查询',
        time,
        copyright
      }))
      return
    }

    const whoisData = await whois(domain)

    // 处理返回为空或无效数据的情况
    if (!whoisData || Object.keys(whoisData).length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({
        code: 404,
        message: '未能获取到有效的WHOIS数据',
        title: 'Whois查询',
        time,
        copyright
      }))
      return
    }

    logger.debug(`[memz-plugin] WHOIS 数据: ${JSON.stringify(whoisData)}`)

    const chineseData = await translateWhoisData(whoisData)

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 0,
      message: '查询成功',
      title: 'Whois查询',
      time,
      data: chineseData,
      copyright
    }))
  } catch (error) {
    logger.error('[memz-plugin] 查询失败:', error)
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 500,
      message: '查询失败',
      title: 'Whois查询',
      time,
      error: error.message,
      copyright
    }))
  }
}
