import { URL } from 'url'
import { fetchIcpInfo } from '../../../model/webtool.js'
import { copyright } from '#components'
import logger from '../../lib/logger.js'
const title = 'ICP备案查询'

export default async (req, res) => {
  const time = new Date().toISOString()
  try {
    const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http')
    const parsedUrl = new URL(req.url, `${protocol}://${req.headers.host}`)

    const domain = parsedUrl.searchParams.get('domain')

    if (!domain) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 400,
        message: '缺少必要的域名参数, 请在查询参数中添加domain参数',
        title,
        time,
        copyright
      }))
    }

    const icpInfo = await fetchIcpInfo(domain)
    logger.debug(`[memz-plugin] 备案查询数据: ${JSON.stringify(icpInfo)}`)

    if (!icpInfo || Object.keys(icpInfo).length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 404,
        message: '未找到该域名的ICP备案信息',
        title,
        time,
        copyright
      }))
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 0,
      message: '查询成功',
      title,
      time,
      data: icpInfo,
      copyright
    }))
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 500,
      message: '查询失败',
      title,
      time,
      error: error.message,
      copyright
    }))
  }
}
