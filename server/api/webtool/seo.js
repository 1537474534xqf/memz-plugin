import { URL } from 'url'
import { fetchSeoFromHtml } from '../../../model/webtool.js'
import { copyright } from '#components'
import logger from '../../lib/logger.js'

export const title = 'SEO查询'
export const key = { url: ['需要查询的URL'] }

export default async (req, res) => {
  const time = new Date().toISOString()
  try {
    const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http')
    const parsedUrl = new URL(req.url, `${protocol}://${req.headers.host}`)

    const url = parsedUrl.searchParams.get('url')

    if (!url) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 400,
        message: '缺少必要的URL参数, 请在查询参数中添加url参数',
        title,
        time,
        copyright
      }))
    }

    const seoInfoJson = await fetchSeoFromHtml(url)
    logger.debug('[memz-plugin] SEO info: ', seoInfoJson)

    let seoInfo
    try {
      seoInfo = JSON.parse(seoInfoJson)
    } catch (e) {
      throw new Error('返回的SEO信息格式无效')
    }

    if (seoInfo.error) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 500,
        message: `查询失败: ${seoInfo.message}`,
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
      data: seoInfo,
      copyright
    }))
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 500,
      message: `查询失败: ${error.message}`,
      title,
      time,
      error: error.message,
      copyright
    }))
  }
}
